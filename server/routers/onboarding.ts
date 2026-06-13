import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  tenants,
  users,
  services,
  serviceCategories,
  settings,
  businessHours as businessHoursTable,
} from "../../drizzle/schema";
import { hash } from "bcryptjs";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { sendWelcomeEmail } from "../services/welcomeEmail";

const onboardingSchema = z.object({
  salonInfo: z.object({
    salonName: z.string().min(2),
    subdomain: z
      .string()
      .min(3)
      .max(63)
      .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
      .refine(
        (val) => /[a-z]/.test(val),
        "Subdomain must contain at least one letter (a-z)"
      ),
    address: z.string().min(5),
    city: z.string().min(2),
    phone: z.string().min(8),
    email: z.string().email(),
  }),
  ownerAccount: z.object({
    ownerName: z.string().min(2),
    ownerEmail: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  }),
  businessHours: z.object({
    mondayOpen: z.string(),
    mondayClose: z.string(),
    tuesdayOpen: z.string(),
    tuesdayClose: z.string(),
    wednesdayOpen: z.string(),
    wednesdayClose: z.string(),
    thursdayOpen: z.string(),
    thursdayClose: z.string(),
    fridayOpen: z.string(),
    fridayClose: z.string(),
    saturdayOpen: z.string(),
    saturdayClose: z.string(),
    sundayClosed: z.boolean(),
  }),
  employees: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        phone: z.string().optional(),
        role: z.enum(["employee", "manager", "admin"]),
        permissions: z.object({
          viewAppointments: z.boolean(),
          manageCustomers: z.boolean(),
          accessReports: z.boolean(),
        }),
      })
    )
    .optional(),
  services: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
        duration: z.number(),
        price: z.number(),
        description: z.string().optional(),
        color: z.string(),
      })
    )
    .optional(),
  paymentSettings: z
    .object({
      stripeEnabled: z.boolean().optional(),
      vippsEnabled: z.boolean().optional(),
    })
    .optional(),
});

export const onboardingRouter = router({
  /**
   * Check if subdomain is available
   */
  checkSubdomain: publicProcedure
    .input(z.object({ subdomain: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db
        .select()
        .from(tenants)
        .where(eq(tenants.subdomain, input.subdomain))
        .limit(1);

      return {
        available: existing.length === 0,
      };
    }),

  /**
   * Complete onboarding process
   */
  complete: publicProcedure
    .input(onboardingSchema)
    .mutation(async ({ input }) => {
      const {
        salonInfo,
        ownerAccount,
        businessHours,
        employees: initialEmployees,
        services: initialServices,
        paymentSettings,
      } = input;

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Check subdomain availability
      const existingTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.subdomain, salonInfo.subdomain))
        .limit(1);

      if (existingTenant.length > 0) {
        throw new Error("Subdomain not available");
      }

      // 2. Create tenant + every child record atomically. If any step fails the
      // whole salon setup rolls back instead of leaving an orphaned, half-built
      // tenant. The transaction parameter is intentionally named `db` so the
      // existing inserts below run on the transaction without modification.
      const tenantId = nanoid();
      await db.transaction(async (db) => {
        await db.insert(tenants).values({
        id: tenantId,
        name: salonInfo.salonName,
        subdomain: salonInfo.subdomain,
        address: salonInfo.address,
        phone: salonInfo.phone,
        email: salonInfo.email,
        status: "trial",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 3. Create owner user account
      const hashedPassword = await hash(ownerAccount.password, 10);
      const userId = nanoid();

      await db.insert(users).values({
        tenantId,
        openId: `owner-${userId}`,
        name: ownerAccount.ownerName,
        email: ownerAccount.ownerEmail,
        passwordHash: hashedPassword,
        role: "owner",
        isActive: true,
        deactivatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });

      // 4. Create settings with business hours
      const businessHoursJson = {
        monday: {
          open: businessHours.mondayOpen,
          close: businessHours.mondayClose,
        },
        tuesday: {
          open: businessHours.tuesdayOpen,
          close: businessHours.tuesdayClose,
        },
        wednesday: {
          open: businessHours.wednesdayOpen,
          close: businessHours.wednesdayClose,
        },
        thursday: {
          open: businessHours.thursdayOpen,
          close: businessHours.thursdayClose,
        },
        friday: {
          open: businessHours.fridayOpen,
          close: businessHours.fridayClose,
        },
        saturday: {
          open: businessHours.saturdayOpen,
          close: businessHours.saturdayClose,
        },
        sunday: businessHours.sundayClosed
          ? null
          : { open: "10:00", close: "16:00" },
      };

      await db.insert(settings).values({
        tenantId,
        settingKey: "business_hours",
        settingValue: JSON.stringify(businessHoursJson),
      });

      // Persist opening hours to the businessHours TABLE as well — that is the
      // representation the public booking engine (getAvailableTimeSlots /
      // createBooking) actually enforces. The settings JSON above is read by
      // other surfaces, so we keep both in sync. dayOfWeek: 0=Sunday..6=Saturday.
      const onboardingDays = [
        { dayOfWeek: 1, open: businessHours.mondayOpen, close: businessHours.mondayClose },
        { dayOfWeek: 2, open: businessHours.tuesdayOpen, close: businessHours.tuesdayClose },
        { dayOfWeek: 3, open: businessHours.wednesdayOpen, close: businessHours.wednesdayClose },
        { dayOfWeek: 4, open: businessHours.thursdayOpen, close: businessHours.thursdayClose },
        { dayOfWeek: 5, open: businessHours.fridayOpen, close: businessHours.fridayClose },
        { dayOfWeek: 6, open: businessHours.saturdayOpen, close: businessHours.saturdayClose },
        {
          dayOfWeek: 0,
          open: businessHours.sundayClosed ? null : "10:00",
          close: businessHours.sundayClosed ? null : "16:00",
        },
      ];
      for (const day of onboardingDays) {
        const isOpen = Boolean(day.open && day.close);
        await db.insert(businessHoursTable).values({
          tenantId,
          dayOfWeek: day.dayOfWeek,
          isOpen,
          openTime: isOpen ? day.open : null,
          closeTime: isOpen ? day.close : null,
        });
      }

      // 5. Create default settings
      const defaultSettings = [
        { key: "booking_enabled", value: "true" },
        { key: "booking_advance_days", value: "30" },
        { key: "booking_min_notice_hours", value: "2" },
        { key: "sms_enabled", value: "false" },
        { key: "email_enabled", value: "true" },
        { key: "currency", value: "NOK" },
        { key: "timezone", value: "Europe/Oslo" },
        { key: "language", value: "no" },
      ];

      for (const setting of defaultSettings) {
        await db.insert(settings).values({
          tenantId,
          settingKey: setting.key,
          settingValue: setting.value,
        });
      }

      // 6. Create initial employees (if provided)
      if (initialEmployees && initialEmployees.length > 0) {
        for (const emp of initialEmployees) {
          const empId = nanoid();
          // 4-digit PIN via CSPRNG (Math.random is not cryptographically secure)
          const { randomInt } = await import("crypto");
          const pin = randomInt(1000, 10000).toString(); // 1000-9999

          await db.insert(users).values({
            tenantId,
            openId: `employee-${empId}`,
            name: emp.name,
            email: emp.email || null,
            phone: emp.phone || null,
            role: (emp.role || "employee") as "owner" | "admin" | "employee",
            pin,
            isActive: true,
            deactivatedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          });
        }
      }

      // 7. Create service categories and services
      // serviceCategories.id is autoincrement, so we need to insert and get the ID back

      if (initialServices && initialServices.length > 0) {
        // Extract unique categories from services
        const uniqueCategories = [
          ...new Set(initialServices.map(s => s.category)),
        ];
        const categoryMap = new Map<string, number>();

        // Create categories (id is autoincrement, don't pass it)
        for (let i = 0; i < uniqueCategories.length; i++) {
          const result = await db.insert(serviceCategories).values({
            tenantId,
            name: uniqueCategories[i],
            displayOrder: i + 1,
          });
          // Get the inserted ID
          const insertedId = Number(result[0].insertId);
          categoryMap.set(uniqueCategories[i], insertedId);
        }

        // Create services
        for (const svc of initialServices) {
          const categoryId = categoryMap.get(svc.category);
          await db.insert(services).values({
            tenantId,
            categoryId: categoryId || null,
            name: svc.name,
            durationMinutes: svc.duration,
            price: String(svc.price),
            description: svc.description || null,
            isActive: true,
          });
        }
      } else {
        // Create default category (id is autoincrement)
        const result = await db.insert(serviceCategories).values({
          tenantId,
          name: "General Services",
          displayOrder: 1,
        });
        const categoryId = Number(result[0].insertId);

        // Create default services
        const defaultServices = [
          { name: "Men's Haircut", duration: 30, price: "250" },
          { name: "Beard Trim", duration: 20, price: "150" },
          { name: "Haircut + Beard", duration: 45, price: "350" },
        ];

        for (const svc of defaultServices) {
          await db.insert(services).values({
            tenantId,
            categoryId,
            name: svc.name,
            durationMinutes: svc.duration,
            price: svc.price,
            isActive: true,
          });
        }
      }

      // 8. Store payment settings (if provided)
      if (paymentSettings) {
        if (paymentSettings.stripeEnabled) {
          await db.insert(settings).values({
            tenantId,
            settingKey: "stripe_enabled",
            settingValue: "true",
          });
        }
        if (paymentSettings.vippsEnabled) {
          await db.insert(settings).values({
            tenantId,
            settingKey: "vipps_enabled",
            settingValue: "true",
          });
        }
      }
      }); // end transaction — tenant + all child records committed atomically

      // 9. Send verification email. The tenant is created with emailVerified
      // defaulting to false, and tenantProcedure blocks EVERY tenant query with
      // EMAIL_NOT_VERIFIED until it is verified. Without this link the owner can
      // log in but is locked out of the entire app with no way to unblock.
      try {
        const { sendVerificationEmail } = await import("../emailService");
        await sendVerificationEmail(tenantId, ownerAccount.ownerEmail);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Don't fail onboarding if email fails; owner can request a resend.
      }

      // 10. Send welcome email
      try {
        await sendWelcomeEmail({
          salonName: salonInfo.salonName,
          ownerName: ownerAccount.ownerName,
          ownerEmail: ownerAccount.ownerEmail,
          subdomain: salonInfo.subdomain,
          loginUrl: `https://${salonInfo.subdomain}.stylora.no/login`,
          trialDays: 14,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail onboarding if email fails
      }

      return {
        success: true,
        tenantId,
        subdomain: salonInfo.subdomain,
        email: ownerAccount.ownerEmail,
        message:
          "Account created successfully! Check your email for login instructions.",
      };
    }),

  /**
   * Generate QR code for employee check-in
   */
  generateEmployeeQR: publicProcedure
    .input(z.object({ employeeId: z.string(), tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const qrCodeData = JSON.stringify({
        employeeId: input.employeeId,
        tenantId: input.tenantId,
        type: "checkin",
      });

      const qrCodeUrl = await QRCode.toDataURL(qrCodeData);

      return {
        qrCode: qrCodeUrl,
      };
    }),
});
