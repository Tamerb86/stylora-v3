import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Package, Plus, Minus, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function Products() {
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{id: number, name: string} | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [barcode, setBarcode] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [minStockLevel, setMinStockLevel] = useState("");
  const [stockAdjustment, setStockAdjustment] = useState("");

  const { data: products = [], refetch } = trpc.products.list.useQuery();

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success(t("products.productCreated"));
      setIsCreateOpen(false);
      refetch();
      resetForm();
    },
    onError: error => {
      toast.error(t("products.createError", { message: error.message }));
    },
  });

  const adjustStockMutation = trpc.products.adjustStock.useMutation({
    onSuccess: () => {
      toast.success(t("products.stockUpdated"));
      setIsStockOpen(false);
      refetch();
      setStockAdjustment("");
    },
    onError: error => {
      toast.error(t("products.stockUpdateError", { message: error.message }));
    },
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success(t("products.productUpdated"));
      setIsEditOpen(false);
      refetch();
      resetForm();
    },
    onError: error => {
      toast.error(t("products.updateError", { message: error.message }));
    },
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success(t("products.productDeleted"));
      setIsDeleteOpen(false);
      setProductToDelete(null);
      refetch();
    },
    onError: error => {
      toast.error(t("products.deleteError", { message: error.message }));
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setCost("");
    setBarcode("");
    setStockQuantity("");
    setMinStockLevel("");
  };

  const handleCreate = () => {
    if (!name || !price) {
      toast.error(t("products.fillNameAndPrice"));
      return;
    }

    createMutation.mutate({
      name,
      description: description || undefined,
      price,
      cost: cost || undefined,
      barcode: barcode || undefined,
      stockQuantity: stockQuantity ? parseInt(stockQuantity) : 0,
      minStockLevel: minStockLevel ? parseInt(minStockLevel) : undefined,
    });
  };

  const handleStockAdjustment = () => {
    if (!selectedProduct || !stockAdjustment) {
      toast.error(t("products.enterQuantity"));
      return;
    }

    adjustStockMutation.mutate({
      productId: selectedProduct,
      adjustment: parseInt(stockAdjustment),
    });
  };

  const openStockDialog = (productId: number) => {
    setSelectedProduct(productId);
    setIsStockOpen(true);
  };

  const openEditDialog = (product: any) => {
    setSelectedProduct(product.id);
    setName(product.name);
    setDescription(product.description || "");
    setPrice(product.retailPrice);
    setCost(product.costPrice || "");
    setBarcode(product.barcode || "");
    setStockQuantity(String(product.stockQuantity || 0));
    setMinStockLevel(String(product.reorderPoint || ""));
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedProduct || !name || !price) {
      toast.error(t("products.fillNameAndPrice"));
      return;
    }

    updateMutation.mutate({
      productId: selectedProduct,
      name,
      description: description || undefined,
      price,
      cost: cost || undefined,
      barcode: barcode || undefined,
      stockQuantity: stockQuantity ? parseInt(stockQuantity) : undefined,
      minStockLevel: minStockLevel ? parseInt(minStockLevel) : undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              {t("products.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("products.subtitle")}
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("products.newProduct")}
          </Button>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">{t("products.noProductsYet")}</p>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                {t("products.noProductsDescription")}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("products.createFirstProduct")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/pos")}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {t("products.goToPos")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map(product => {
              const isLowStock =
                product.reorderPoint &&
                product.stockQuantity !== null &&
                product.stockQuantity <= product.reorderPoint;

              return (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{product.name}</h3>
                          {product.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("products.price")}</span>
                        <span className="font-medium">
                          {product.retailPrice} NOK
                        </span>
                      </div>

                      {product.costPrice && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("products.costPrice")}
                          </span>
                          <span>{product.costPrice} NOK</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("products.inStock")}</span>
                        <span
                          className={`font-medium ${isLowStock ? "text-red-600" : ""}`}
                        >
                          {t("products.stockCount", { count: product.stockQuantity ?? 0 })}
                          {isLowStock && " ⚠️"}
                        </span>
                      </div>

                      {product.barcode && (
                        <div className="text-xs text-muted-foreground">
                          {t("products.barcodeLabel", { barcode: product.barcode })}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openEditDialog(product)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          {t("products.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openStockDialog(product.id)}
                        >
                          {t("products.adjustStock")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setProductToDelete({ id: product.id, name: product.name });
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        onClick={() => (window.location.href = "/pos")}
                      >
                        <ShoppingCart className="h-3 w-3 mr-2" />
                        {t("products.goToPos")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Product Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("products.newProduct")}</DialogTitle>
              <DialogDescription>
                {t("products.createDialogDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t("products.productNameLabel")}</Label>
                <Input
                  id="name"
                  placeholder={t("products.productNamePlaceholder")}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="description">{t("products.descriptionLabel")}</Label>
                <Input
                  id="description"
                  placeholder={t("products.descriptionPlaceholder")}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">{t("products.salesPriceLabel")}</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="299.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cost">{t("products.costPriceLabel")}</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={cost}
                    onChange={e => setCost(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="barcode">{t("products.barcodeFieldLabel")}</Label>
                <Input
                  id="barcode"
                  placeholder={t("products.barcodePlaceholder")}
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stockQuantity">{t("products.stockQuantityLabel")}</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    placeholder="0"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="minStockLevel">{t("products.minStockLevelLabel")}</Label>
                  <Input
                    id="minStockLevel"
                    type="number"
                    placeholder="5"
                    value={minStockLevel}
                    onChange={e => setMinStockLevel(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t("products.cancel")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? t("products.creating")
                  : t("products.createProduct")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("products.editProduct")}</DialogTitle>
              <DialogDescription>{t("products.editDialogDescription")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">{t("products.productNameLabel")}</Label>
                <Input
                  id="edit-name"
                  placeholder={t("products.productNamePlaceholder")}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Beskrivelse</Label>
                <Input
                  id="edit-description"
                  placeholder="Valgfri beskrivelse"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">{t("products.salesPriceLabel")}</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    placeholder="299.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-cost">{t("products.costPriceLabel")}</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={cost}
                    onChange={e => setCost(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-barcode">{t("products.barcodeFieldLabel")}</Label>
                <Input
                  id="edit-barcode"
                  placeholder={t("products.barcodePlaceholder")}
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-stockQuantity">{t("products.stockQuantityLabel")}</Label>
                  <Input
                    id="edit-stockQuantity"
                    type="number"
                    placeholder="0"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-minStockLevel">{t("products.minStockLevelLabel")}</Label>
                  <Input
                    id="edit-minStockLevel"
                    type="number"
                    placeholder="5"
                    value={minStockLevel}
                    onChange={e => setMinStockLevel(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                {t("products.cancel")}
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending
                  ? t("products.updating")
                  : t("products.saveChanges")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stock Adjustment Dialog */}
        <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("products.adjustStockTitle")}</DialogTitle>
              <DialogDescription>
                {t("products.adjustStockDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="adjustment">
                  {t("products.adjustmentLabel")}
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setStockAdjustment(prev =>
                        String(parseInt(prev || "0") - 1)
                      )
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="adjustment"
                    type="number"
                    placeholder="0"
                    value={stockAdjustment}
                    onChange={e => setStockAdjustment(e.target.value)}
                    className="flex-1 text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setStockAdjustment(prev =>
                        String(parseInt(prev || "0") + 1)
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("products.adjustmentHint")}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStockOpen(false)}>
                {t("products.cancel")}
              </Button>
              <Button
                onClick={handleStockAdjustment}
                disabled={adjustStockMutation.isPending}
              >
                {adjustStockMutation.isPending
                  ? t("products.updating")
                  : t("products.updateStock")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("products.deleteProduct")}</DialogTitle>
              <DialogDescription>
                {t("products.deleteConfirm", { name: productToDelete?.name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                {t("products.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (productToDelete) {
                    deleteMutation.mutate({ productId: productToDelete.id });
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t("products.deleting") : t("products.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
