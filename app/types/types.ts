export interface ProteinVariant {
  name: string;
  type: "veg" | "non-veg";
  imageUrl?: string;
  price: number | string;
}

export interface menuItem {
  title: string;
  categoryId: number;
  imagesrc: { src: string };
  id: string;
  imageUrl: string;
  description: string | undefined;
  price: number | string;
  rating: number | string;
  reviews: string;
  url: string;
  category?: string;
  cuisine?: string;
  order_type?: string;
  proteinVariants?: ProteinVariant[];
  selectedProtein?: string;
  selectedSize?: "regular" | "jumbo";
}

export interface addOnsItem {
  type: string;
  value: Array<{
    item: string;
    imagesrc: { src: string };
  }>;
}

export interface PreOrderMenuItem {
  tabName: string;
  title?: string;
  imagesrc?: { src: string };
  description?: string;
  category?: string;
  addOns?: Array<addOnsItem>;
  specificAddons?: Array<addOnsItem>;
}
