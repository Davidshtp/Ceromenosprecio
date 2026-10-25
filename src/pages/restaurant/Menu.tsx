import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Package, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  Loading,
  Alert,
  Textarea,
  Select,
} from "../../components/ui";
import {
  subscribeToMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  getMenuCategories,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
} from "../../services/restaurantService";
import type { MenuItem, ProductImage } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import {
  deleteImageFromCloudinary,
  getCloudinaryPublicId,
  uploadImageAssetToCloudinary,
} from "../../services/cloudinaryService";

const Menu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    getMenuCategories(user.restaurant_id).then(({ data }) => {
      setMenuCategories(data);
    });

    const subscription = subscribeToMenuItems(user.restaurant_id, (data) => {
      setMenuItems(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category_name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleAvailability = async (item: MenuItem) => {
    await toggleMenuItemAvailability(item.id, !item.is_available);
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDelete = (item: MenuItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  if (loading) {
    return <Loading text="Cargando menú..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="mb-1 text-2xl font-bold text-text">Menú</h2>
          <p className="text-sm text-text-secondary">
            Administra tus productos, categorías y disponibilidad.
          </p>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>
          Actualización en tiempo real · Los cambios se reflejan en el menú público.
        </span>
      </div>

      {/* Menu editor */}
      <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="flex w-full items-center justify-center gap-2 bg-accent px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" />
            Añadir categoría
          </button>
          <div className="flex gap-2 overflow-x-auto p-2 md:block md:space-y-1 md:overflow-visible">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`block shrink-0 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors md:w-full ${
                categoryFilter === "all"
                  ? "bg-bg-subtle text-text"
                  : "text-text-secondary hover:bg-bg-subtle hover:text-text"
              }`}
            >
              Todos los productos
            </button>
            {menuCategories.map((category) => (
              <div key={category.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCategoryFilter(category.name)}
                  className={`min-w-0 flex-1 shrink-0 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    categoryFilter === category.name
                      ? "bg-bg-subtle text-text"
                      : "text-text-secondary hover:bg-bg-subtle hover:text-text"
                  }`}
                >
                  <span className="block truncate">{category.name}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Editar ${category.name}`}
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowEditCategoryModal(true);
                  }}
                  className="rounded p-1.5 text-text-secondary hover:bg-bg-subtle hover:text-accent"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar ${category.name}`}
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowDeleteCategoryModal(true);
                  }}
                  className="rounded p-1.5 text-text-secondary hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                {categoryFilter === "all" ? "Menú completo" : categoryFilter}
              </p>
              <h3 className="mt-1 text-xl font-bold text-text">Productos</h3>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="h-4 w-4" />}
                className="text-sm"
              />
            </div>
          </div>

          {/* Menu Items */}
          {filteredItems.length === 0 ? (
            <Card className="py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-text-secondary opacity-50" />
              <h3 className="mb-2 text-lg font-semibold text-text">
                No se encontraron productos
              </h3>
              <p className="mb-4 text-sm text-text-secondary">
                {searchTerm || categoryFilter !== "all"
                  ? "Prueba cambiando los filtros."
                  : "Comienza agregando tu primer producto."}
              </p>
              <Button
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setShowAddModal(true)}
              >
                Agregar producto
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className={`rounded-2xl p-3 shadow-sm transition-shadow hover:shadow-md ${
                    !item.is_available ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-bg-subtle sm:h-20 sm:w-28">
                      {(item.product_images?.[0]?.url || item.image_url) ? (
                        <img
                          src={item.product_images?.[0]?.url || item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-text-secondary">
                          <Package className="h-6 w-6 opacity-50" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-text sm:text-base">{item.name}</h3>
                        <Badge variant={item.is_available ? "success" : "neutral"} className="text-[10px]">
                          {item.is_available ? "Disponible" : "No disponible"}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                        <span className="font-bold text-text">{formatCurrency(item.base_price)}</span>
                        {item.sizes?.length ? <span>{item.sizes.length} tamaños</span> : null}
                        {item.addons?.length ? <span>{item.addons.length} adicionales</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border pt-2 sm:border-t-0 sm:pt-0">
                      <Button
                        size="sm"
                        variant={item.is_available ? "outline" : "secondary"}
                        icon={item.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        onClick={() => handleToggleAvailability(item)}
                        className="px-2 text-xs"
                        aria-label={item.is_available ? "Marcar no disponible" : "Marcar disponible"}
                      >
                        <span className="hidden lg:inline">{item.is_available ? "Ocultar" : "Mostrar"}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Edit className="h-4 w-4" />}
                        onClick={() => handleEdit(item)}
                        className="px-2 text-xs"
                        aria-label={`Editar ${item.name}`}
                      >
                        <span className="hidden lg:inline">Editar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => handleDelete(item)}
                        className="px-2 text-xs"
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <span className="hidden lg:inline">Eliminar</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex min-h-24 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-accent/50 bg-accent/[0.03] text-sm font-bold text-accent transition-colors hover:bg-accent/[0.08]"
              >
                <Plus className="h-5 w-5" />
                Añadir producto
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Add/Edit Modals */}
      <MenuItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="add"
        categories={menuCategories}
      />

      <MenuItemModal
        isOpen={showEditModal}
        item={selectedItem}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        mode="edit"
        categories={menuCategories}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        item={selectedItem}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
      />

      <CategoryModal
        isOpen={showCategoryModal}
        restaurantId={
          JSON.parse(localStorage.getItem("user") || "{}").restaurant_id || ""
        }
        onClose={() => setShowCategoryModal(false)}
        onCreated={(category) => {
          setMenuCategories((current) => [...current, category]);
          setShowCategoryModal(false);
        }}
      />
      <CategoryEditModal
        isOpen={showEditCategoryModal}
        category={selectedCategory}
        onClose={() => {
          setShowEditCategoryModal(false);
          setSelectedCategory(null);
        }}
        onUpdated={(category) => {
          setMenuCategories((current) =>
            current.map((item) => (item.id === category.id ? category : item))
          );
          setCategoryFilter((current) =>
            selectedCategory?.name === current ? category.name : current
          );
          setShowEditCategoryModal(false);
          setSelectedCategory(null);
        }}
      />
      <DeleteCategoryModal
        isOpen={showDeleteCategoryModal}
        category={selectedCategory}
        onClose={() => {
          setShowDeleteCategoryModal(false);
          setSelectedCategory(null);
        }}
        onDeleted={(categoryId) => {
          setMenuCategories((current) => current.filter((item) => item.id !== categoryId));
          if (selectedCategory?.name === categoryFilter) setCategoryFilter("all");
          setShowDeleteCategoryModal(false);
          setSelectedCategory(null);
        }}
      />
    </div>
  );
};

interface CategoryModalProps {
  isOpen: boolean;
  restaurantId: string;
  onClose: () => void;
  onCreated: (category: { id: string; name: string }) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  restaurantId,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !restaurantId) {
      setError("El nombre de la categoría es obligatorio.");
      return;
    }

    setLoading(true);
    const result = await createMenuCategory({
      restaurant_id: restaurantId,
      name: name.trim(),
    });
    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error?.message || "No se pudo crear la categoría.");
      return;
    }

    setName("");
    onCreated(result.data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva categorÃ­a" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}
        <Input
          label="Nombre de la categorÃ­a"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej.: Hamburguesas"
          required
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear categorÃ­a
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface CategoryEditModalProps {
  isOpen: boolean;
  category: { id: string; name: string } | null;
  onClose: () => void;
  onUpdated: (category: { id: string; name: string }) => void;
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  isOpen,
  category,
  onClose,
  onUpdated,
}) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(category?.name || "");
    setError("");
  }, [category, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!category || !name.trim()) {
      setError("El nombre de la categoría es obligatorio.");
      return;
    }
    setLoading(true);
    const result = await updateMenuCategory(category.id, name);
    setLoading(false);
    if (result.error || !result.data) {
      setError(result.error?.message || "No se pudo actualizar la categoría.");
      return;
    }
    onUpdated(result.data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar categoría" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}
        <Input
          label="Nombre de la categoría"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface DeleteCategoryModalProps {
  isOpen: boolean;
  category: { id: string; name: string } | null;
  onClose: () => void;
  onDeleted: (categoryId: string) => void;
}

const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  category,
  onClose,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!category) return;
    setLoading(true);
    const result = await deleteMenuCategory(category.id);
    setLoading(false);
    if (result.error) {
      toast.error("No se puede eliminar la categoría", {
        description:
          "Primero elimina o reasigna los productos asociados a esta categoría.",
      });
      onClose();
      return;
    }
    toast.success("Categoría eliminada");
    onDeleted(category.id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar categoría" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          ¿Seguro que deseas eliminar la categoría <strong className="text-text">{category?.name}</strong>?
          Solo podrás eliminarla si no tiene productos asociados.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={loading} fullWidth>
            Eliminar categoría
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Menu Item Modal (Add/Edit)
interface MenuItemModalProps {
  isOpen: boolean;
  item?: MenuItem | null;
  onClose: () => void;
  mode: "add" | "edit";
  categories: { id: string; name: string }[];
}

const MenuItemModal: React.FC<MenuItemModalProps> = ({
  isOpen,
  item,
  onClose,
  mode,
  categories,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    base_price: "",
    product_images: [] as ProductImage[],
    ingredients: [] as string[],
    is_available: true,
    sizes: [] as { name: string; price: number }[],
    addons: [] as { name: string; price: number }[],
  });

  const [newSize, setNewSize] = useState({ name: "", price: "" });
  const [newAddon, setNewAddon] = useState({ name: "", price: "" });
  const [newIngredient, setNewIngredient] = useState("");

  useEffect(() => {
    if (mode === "edit" && item) {
      setFormData({
        name: item.name,
        description: item.description || "",
        category_id: item.category_id || "",
        base_price: item.base_price.toString(),
        product_images:
          item.product_images?.length
            ? item.product_images
            : item.image_url
              ? [{ url: item.image_url }]
              : [],
        ingredients: item.ingredients || [],
        is_available: item.is_available,
        sizes: item.sizes || [],
        addons: item.addons || [],
      });
    } else {
      setFormData({
        name: "",
        description: "",
        category_id: "",
        base_price: "",
        product_images: [],
        ingredients: [],
        is_available: true,
        sizes: [],
        addons: [],
      });
    }
  }, [mode, item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.base_price) {
      setError("El nombre y el precio base son obligatorios.");
      return;
    }
    if (formData.product_images.length === 0) {
      toast.error("No se puede guardar el producto", {
        description: "Debes agregar al menos una foto del producto.",
      });
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) {
      setError("No se encontró el restaurante.");
      return;
    }

    setLoading(true);

    const menuItemData = {
      restaurant_id: user.restaurant_id,
      name: formData.name,
      description: formData.description || undefined,
      category_id: formData.category_id || undefined,
      base_price: parseFloat(formData.base_price),
      image_url: formData.product_images[0].url,
      product_images: formData.product_images,
      ingredients: formData.ingredients,
      is_available: formData.is_available,
      sizes: formData.sizes.length > 0 ? formData.sizes : undefined,
      addons: formData.addons.length > 0 ? formData.addons : undefined,
    };

    const previousImages = item?.product_images?.length
      ? item.product_images
      : item?.image_url
        ? [{ url: item.image_url }]
        : [];
    let success = false;
    if (mode === "add") {
      const result = await createMenuItem(menuItemData);
      success = !result.error;
    } else if (item) {
      success = await updateMenuItem(item.id, menuItemData);
    }

    setLoading(false);

    if (success) {
      const retainedIds = new Set(
        formData.product_images
          .map((image) => image.public_id || getCloudinaryPublicId(image.url))
          .filter(Boolean)
      );
      try {
        await Promise.all(
          previousImages
            .map((image) => image.public_id || getCloudinaryPublicId(image.url))
            .filter((publicId): publicId is string => Boolean(publicId))
            .filter((publicId) => !retainedIds.has(publicId))
            .map((publicId) => deleteImageFromCloudinary(publicId))
        );
      } catch (deleteError) {
        toast.error("El producto se guardó, pero hubo un problema", {
          description:
            deleteError instanceof Error
              ? `No se pudo eliminar una foto anterior de Cloudinary: ${deleteError.message}`
              : "No se pudo eliminar una foto anterior de Cloudinary.",
        });
        return;
      }
      onClose();
    } else {
      setError(mode === "add" ? "No se pudo agregar el producto." : "No se pudo actualizar el producto.");
    }
  };

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    setLoading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((file) =>
          uploadImageAssetToCloudinary(file, "product")
        )
      );
      setFormData((current) => ({
        ...current,
        product_images: [...current.product_images, ...uploaded],
      }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudieron subir las fotos."
      );
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((current) => ({
      ...current,
      product_images: current.product_images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const addIngredient = () => {
    const ingredient = newIngredient.trim();
    if (!ingredient) return;

    setFormData((current) => ({
      ...current,
      ingredients: [...current.ingredients, ingredient],
    }));
    setNewIngredient("");
  };

  const removeIngredient = (index: number) => {
    setFormData((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    }));
  };

  const addSize = () => {
    if (newSize.name && newSize.price) {
      setFormData({
        ...formData,
        sizes: [
          ...formData.sizes,
          { name: newSize.name, price: parseFloat(newSize.price) },
        ],
      });
      setNewSize({ name: "", price: "" });
    }
  };

  const removeSize = (index: number) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.filter((_, i) => i !== index),
    });
  };

  const addAddon = () => {
    if (newAddon.name && newAddon.price) {
      setFormData({
        ...formData,
        addons: [
          ...formData.addons,
          { name: newAddon.name, price: parseFloat(newAddon.price) },
        ],
      });
      setNewAddon({ name: "", price: "" });
    }
  };

  const removeAddon = (index: number) => {
    setFormData({
      ...formData,
      addons: formData.addons.filter((_, i) => i !== index),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Agregar producto" : "Editar producto"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Nombre del producto"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej.: Hamburguesa especial"
          required
        />

        <Textarea
          label="Descripción (opcional)"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Describe tu producto..."
          rows={2}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Categoría"
            value={formData.category_id}
            onChange={(e) =>
              setFormData({ ...formData, category_id: e.target.value })
            }
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
          />

          <Input
            label="Precio base"
            type="number"
            step="0.01"
            value={formData.base_price}
            onChange={(e) =>
              setFormData({ ...formData, base_price: e.target.value })
            }
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <label className="label">Fotos del producto *</label>
              <p className="text-xs text-text-secondary">
                Agrega una o varias fotos. La primera será la portada.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-accent px-3 py-2 text-xs font-bold text-accent hover:bg-accent/5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Agregar fotos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                disabled={loading}
                onChange={(event) => {
                  void addImages(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {formData.product_images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {formData.product_images.map((image, index) => (
                <div key={`${image.url}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-bg-subtle">
                  <img src={image.url} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                      Portada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-error shadow"
                    aria-label={`Eliminar foto ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <label className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-text-secondary hover:border-accent hover:text-accent">
              <ImagePlus className="mb-2 h-8 w-8" />
              <span className="text-sm">Selecciona las fotos del producto</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(event) => {
                  void addImages(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          )}
        </div>

        <div>
          <label className="label mb-1">¿Qué incluye este plato? (opcional)</label>
          <p className="mb-3 text-xs text-text-secondary">
            Agrega cada ingrediente por separado para que tus clientes sepan qué contiene.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {formData.ingredients.map((ingredient, index) => (
              <span
                key={`${ingredient}-${index}`}
                className="inline-flex items-center gap-2 rounded-full bg-bg-subtle px-3 py-1.5 text-sm text-text"
              >
                {ingredient}
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="text-error"
                  aria-label={`Eliminar ingrediente ${ingredient}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ej.: Papa rústica"
              value={newIngredient}
              onChange={(event) => setNewIngredient(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addIngredient();
                }
              }}
            />
            <Button type="button" onClick={addIngredient} variant="outline">
              Agregar
            </Button>
          </div>
        </div>

        {/* Sizes */}
        <div>
          <label className="label mb-3">Tamaños (opcional)</label>
          <div className="space-y-2 mb-3">
            {formData.sizes.map((size, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <span className="text-text">
                  {size.name} - {formatCurrency(size.price)}
                </span>
                <button
                  type="button"
                  onClick={() => removeSize(index)}
                  className="text-error hover:bg-error/10 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del tamaño"
              value={newSize.name}
              onChange={(e) => setNewSize({ ...newSize, name: e.target.value })}
            />
            <Input
              placeholder="Precio"
              type="number"
              step="0.01"
              value={newSize.price}
              onChange={(e) =>
                setNewSize({ ...newSize, price: e.target.value })
              }
            />
            <Button type="button" onClick={addSize} variant="outline">
              Agregar
            </Button>
          </div>
        </div>

        {/* Add-ons */}
        <div>
          <label className="label mb-3">Adicionales (opcional)</label>
          <div className="space-y-2 mb-3">
            {formData.addons.map((addon, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <span className="text-text">
                  {addon.name} - +{formatCurrency(addon.price)}
                </span>
                <button
                  type="button"
                  onClick={() => removeAddon(index)}
                  className="text-error hover:bg-error/10 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del adicional"
              value={newAddon.name}
              onChange={(e) =>
                setNewAddon({ ...newAddon, name: e.target.value })
              }
            />
            <Input
              placeholder="Precio"
              type="number"
              step="0.01"
              value={newAddon.price}
              onChange={(e) =>
                setNewAddon({ ...newAddon, price: e.target.value })
              }
            />
            <Button type="button" onClick={addAddon} variant="outline">
              Agregar
            </Button>
          </div>
        </div>

        {/* Availability */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_available}
            onChange={(e) =>
              setFormData({ ...formData, is_available: e.target.checked })
            }
            className="rounded border-border"
          />
          <span className="text-text">Disponible para pedidos</span>
        </label>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            {mode === "add" ? "Agregar producto" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Delete Modal
interface DeleteModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, item, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!item) return;

    setLoading(true);
    const success = await deleteMenuItem(item.id);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar producto" size="md">
      <div className="space-y-4">
        <Alert
          type="warning"
          message={`¿Seguro que deseas eliminar "${item.name}"? Esta acción no se puede deshacer.`}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={loading}
            fullWidth
          >
            Eliminar producto
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Menu;
