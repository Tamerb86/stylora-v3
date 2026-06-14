import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Upload,
  Download,
  Users,
  Briefcase,
  Package,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

export default function DataImport() {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("customers");

  const { data: imports, refetch } = trpc.imports.list.useQuery();

  const importCustomers = trpc.imports.importCustomers.useMutation({
    onSuccess: data => {
      toast.success(
        t("dataImport.importedCustomers", {
          imported: data.imported,
          total: data.total,
        })
      );
      if (data.failed > 0) {
        toast.warning(t("dataImport.failedCustomers", { count: data.failed }));
      }
      setUploading(false);
      refetch();
    },
    onError: error => {
      toast.error(error.message || t("dataImport.couldNotImportCustomers"));
      setUploading(false);
    },
  });

  const importServices = trpc.imports.importServices.useMutation({
    onSuccess: data => {
      toast.success(
        t("dataImport.importedServices", {
          imported: data.imported,
          total: data.total,
        })
      );
      if (data.failed > 0) {
        toast.warning(t("dataImport.failedServices", { count: data.failed }));
      }
      setUploading(false);
      refetch();
    },
    onError: error => {
      toast.error(error.message || t("dataImport.couldNotImportServices"));
      setUploading(false);
    },
  });

  const importProducts = trpc.imports.importProducts.useMutation({
    onSuccess: data => {
      toast.success(
        t("dataImport.importedProducts", {
          imported: data.imported,
          total: data.total,
        })
      );
      if (data.failed > 0) {
        toast.warning(t("dataImport.failedProducts", { count: data.failed }));
      }
      setUploading(false);
      refetch();
    },
    onError: error => {
      toast.error(error.message || t("dataImport.couldNotImportProducts"));
      setUploading(false);
    },
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      toast.error(
        t("dataImport.invalidFileType", {
          types: validExtensions.join(", "),
        })
      );
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("dataImport.fileTooLarge"));
      return;
    }

    setUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async e => {
        const base64Content = e.target?.result as string;
        const base64Data = base64Content.split(",")[1]; // Remove data:*/*;base64, prefix

        // Upload based on type
        switch (type) {
          case "customers":
            await importCustomers.mutateAsync({
              fileContent: base64Data,
              fileName: file.name,
            });
            break;
          case "services":
            await importServices.mutateAsync({
              fileContent: base64Data,
              fileName: file.name,
            });
            break;
          case "products":
            await importProducts.mutateAsync({
              fileContent: base64Data,
              fileName: file.name,
            });
            break;
        }
      };

      reader.onerror = () => {
        toast.error(t("dataImport.couldNotReadFile"));
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(error.message || t("dataImport.errorOccurred"));
      setUploading(false);
    }

    // Reset input
    event.target.value = "";
  };

  const downloadTemplate = (type: string) => {
    let csvContent = "";
    let fileName = "";

    switch (type) {
      case "customers":
        csvContent = "firstName,lastName,phone,email,notes\n";
        csvContent += "Ola,Nordmann,12345678,ola@example.com,Stamkunde\n";
        csvContent += "Kari,Hansen,87654321,kari@example.com,\n";
        fileName = "customers_template.csv";
        break;
      case "services":
        csvContent = "name,description,price,duration\n";
        csvContent += "Herreklipp,Standard herreklipp,350,30\n";
        csvContent += "Dameklipp,Standard dameklipp,450,45\n";
        fileName = "services_template.csv";
        break;
      case "products":
        csvContent =
          "name,description,price,costPrice,stock,lowStockThreshold,sku,barcode\n";
        csvContent +=
          "Shampoo,Profesjonell shampoo,150,75,50,10,SH001,1234567890123\n";
        csvContent += "Voks,Stylingvoks,120,60,30,5,WX001,9876543210987\n";
        fileName = "products_template.csv";
        break;
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(t("dataImport.templateDownloaded"));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            {t("dataImport.statusCompleted")}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {t("dataImport.statusFailed")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="h-4 w-4" />
            {t("dataImport.statusInProgress")}
          </span>
        );
    }
  };

  const getImportTypeLabel = (type: string) => {
    switch (type) {
      case "customers":
        return t("dataImport.typeCustomers");
      case "services":
        return t("dataImport.typeServices");
      case "products":
        return t("dataImport.typeProducts");
      case "sql_restore":
        return t("dataImport.typeSqlRestore");
      default:
        return type;
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return t("dataImport.unknownSize");
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      const kb = bytes / 1024;
      return `${kb.toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">{t("dataImport.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("dataImport.subtitle")}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="customers">
              <Users className="h-4 w-4 mr-2" />
              {t("dataImport.typeCustomers")}
            </TabsTrigger>
            <TabsTrigger value="services">
              <Briefcase className="h-4 w-4 mr-2" />
              {t("dataImport.typeServices")}
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              {t("dataImport.typeProducts")}
            </TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>{t("dataImport.importCustomersTitle")}</CardTitle>
                <CardDescription>
                  {t("dataImport.importCustomersDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate("customers")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("dataImport.downloadTemplate")}
                  </Button>

                  <label htmlFor="customers-upload">
                    <Button variant="default" disabled={uploading} asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading
                          ? t("dataImport.uploading")
                          : t("dataImport.uploadFile")}
                      </span>
                    </Button>
                    <input
                      id="customers-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={e => handleFileUpload(e, "customers")}
                      disabled={uploading}
                    />
                  </label>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-semibold mb-2">
                        {t("dataImport.requiredColumns")}
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          <code>firstName</code> - {t("dataImport.colFirstName")}
                        </li>
                        <li>
                          <code>phone</code> - {t("dataImport.colPhone")}
                        </li>
                        <li>
                          <code>lastName</code> - {t("dataImport.colLastName")}
                        </li>
                        <li>
                          <code>email</code> - {t("dataImport.colEmail")}
                        </li>
                        <li>
                          <code>notes</code> - {t("dataImport.colNotes")}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle>{t("dataImport.importServicesTitle")}</CardTitle>
                <CardDescription>
                  {t("dataImport.importServicesDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate("services")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("dataImport.downloadTemplate")}
                  </Button>

                  <label htmlFor="services-upload">
                    <Button variant="default" disabled={uploading} asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading
                          ? t("dataImport.uploading")
                          : t("dataImport.uploadFile")}
                      </span>
                    </Button>
                    <input
                      id="services-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={e => handleFileUpload(e, "services")}
                      disabled={uploading}
                    />
                  </label>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-semibold mb-2">
                        {t("dataImport.requiredColumns")}
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          <code>name</code> - {t("dataImport.colServiceName")}
                        </li>
                        <li>
                          <code>price</code> - {t("dataImport.colServicePrice")}
                        </li>
                        <li>
                          <code>duration</code> - {t("dataImport.colDuration")}
                        </li>
                        <li>
                          <code>description</code> -{" "}
                          {t("dataImport.colDescription")}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>{t("dataImport.importProductsTitle")}</CardTitle>
                <CardDescription>
                  {t("dataImport.importProductsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate("products")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("dataImport.downloadTemplate")}
                  </Button>

                  <label htmlFor="products-upload">
                    <Button variant="default" disabled={uploading} asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading
                          ? t("dataImport.uploading")
                          : t("dataImport.uploadFile")}
                      </span>
                    </Button>
                    <input
                      id="products-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={e => handleFileUpload(e, "products")}
                      disabled={uploading}
                    />
                  </label>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-semibold mb-2">
                        {t("dataImport.requiredColumns")}
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          <code>name</code> - {t("dataImport.colProductName")}
                        </li>
                        <li>
                          <code>price</code> - {t("dataImport.colSalesPrice")}
                        </li>
                        <li>
                          <code>description</code> -{" "}
                          {t("dataImport.colDescription")}
                        </li>
                        <li>
                          <code>costPrice</code> - {t("dataImport.colCostPrice")}
                        </li>
                        <li>
                          <code>stock</code> - {t("dataImport.colStock")}
                        </li>
                        <li>
                          <code>lowStockThreshold</code> -{" "}
                          {t("dataImport.colLowStockThreshold")}
                        </li>
                        <li>
                          <code>sku</code> - {t("dataImport.colSku")}
                        </li>
                        <li>
                          <code>barcode</code> - {t("dataImport.colBarcode")}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Import History */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dataImport.historyTitle")}</CardTitle>
            <CardDescription>
              {t("dataImport.historyDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!imports || imports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{t("dataImport.noImports")}</p>
                <p className="text-sm mt-2">
                  {t("dataImport.noImportsHint")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {imports.map((imp: any) => (
                  <div
                    key={imp.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold">{imp.fileName}</span>
                        {getStatusBadge(imp.status)}
                        <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          {getImportTypeLabel(imp.importType)}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          {format(new Date(imp.createdAt), "PPP 'kl.' HH:mm", {
                            locale: nb,
                          })}
                        </div>
                        <div>
                          {t("dataImport.sizeLabel")}:{" "}
                          {formatFileSize(imp.fileSize)} |{" "}
                          {t("dataImport.totalLabel")}: {imp.recordsTotal} |{" "}
                          {t("dataImport.importedLabel")}: {imp.recordsImported}{" "}
                          | {t("dataImport.failedLabel")}: {imp.recordsFailed}
                        </div>
                      </div>

                      {imp.status === "failed" && imp.errorMessage && (
                        <div className="text-sm mt-2 text-red-600 dark:text-red-400">
                          {t("dataImport.errorLabel")}: {imp.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
