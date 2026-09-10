import { useState } from "react";
import { Plus, Trash2, PackagePlus, Store, Calendar, Tag, Shirt, Coins, FileText, Layers } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";

interface ItemRow {
  key: string;
  brand: string;
  type: string;
  priceCents: string;
  description: string;
  category: string;
}

function emptyRow(key: string): ItemRow {
  return { key, brand: "", type: "", priceCents: "", description: "", category: "" };
}

interface Props {
  serverError?: string | null;
}

export default function OrderForm({ serverError }: Props) {
  const [store, setStore] = useState("");
  const [orderDate, setOrderDate] = useState("");
  // Fixed key for the initial row: crypto.randomUUID() here would produce a
  // different value during SSR vs. client hydration, mismatching the id/key
  // React expects and silently breaking this island's interactivity.
  const [items, setItems] = useState<ItemRow[]>([emptyRow("row-0")]);

  function updateItem(key: string, field: keyof Omit<ItemRow, "key">, value: string) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    // Safe to use crypto.randomUUID() here: this only ever runs client-side,
    // triggered by a click after hydration has already completed.
    setItems((prev) => [...prev, emptyRow(crypto.randomUUID())]);
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));
  }

  return (
    <form method="POST" action="/api/orders/create" className="space-y-6">
      <FormField
        id="store"
        label="Store"
        value={store}
        onChange={setStore}
        placeholder="e.g. Zalando"
        icon={<Store className="size-4" />}
      />
      <FormField
        id="orderDate"
        name="orderDate"
        label="Order date"
        type="date"
        value={orderDate}
        onChange={setOrderDate}
        icon={<Calendar className="size-4" />}
      />

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.key} className="space-y-3 rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-blue-100/80">Product {index + 1}</h3>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    removeItem(item.key);
                  }}
                  className="text-red-300 transition-colors hover:text-red-200"
                  aria-label={`Remove product ${index + 1}`}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <FormField
              id={`brand-${item.key}`}
              name={`items[${index}][brand]`}
              label="Brand"
              value={item.brand}
              onChange={(v) => {
                updateItem(item.key, "brand", v);
              }}
              icon={<Tag className="size-4" />}
            />
            <FormField
              id={`type-${item.key}`}
              name={`items[${index}][type]`}
              label="Type"
              value={item.type}
              onChange={(v) => {
                updateItem(item.key, "type", v);
              }}
              placeholder="e.g. t-shirt"
              icon={<Shirt className="size-4" />}
            />
            <FormField
              id={`price-${item.key}`}
              name={`items[${index}][priceCents]`}
              label="Price (cents)"
              type="number"
              value={item.priceCents}
              onChange={(v) => {
                updateItem(item.key, "priceCents", v);
              }}
              placeholder="e.g. 3499 for 34.99"
              icon={<Coins className="size-4" />}
            />
            <FormField
              id={`description-${item.key}`}
              name={`items[${index}][description]`}
              label="Description (optional)"
              value={item.description}
              onChange={(v) => {
                updateItem(item.key, "description", v);
              }}
              icon={<FileText className="size-4" />}
            />
            <FormField
              id={`category-${item.key}`}
              name={`items[${index}][category]`}
              label="Category (optional)"
              value={item.category}
              onChange={(v) => {
                updateItem(item.key, "category", v);
              }}
              icon={<Layers className="size-4" />}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-2 text-sm text-purple-300 transition-colors hover:text-purple-200"
      >
        <Plus className="size-4" /> Add product
      </button>

      <ServerError message={serverError} />

      <SubmitButton pendingText="Creating order..." icon={<PackagePlus className="size-4" />}>
        Create order
      </SubmitButton>
    </form>
  );
}
