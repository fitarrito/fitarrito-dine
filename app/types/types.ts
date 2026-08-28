export interface ProteinVariant {
    name: string;
    type: "veg" | "non-veg"; // Type of protein: vegetarian or non-vegetarian
    imageUrl?:string; // Optional image for the protein variant
    nutrient: {
      regular: { cals: string; protein: string; fat: string; carbs: string; price: string };
      jumbo: { cals: string; protein: string; fat: string; carbs: string; price: string };
    };
  }


export interface menuItem {
    title: string;
    categoryId:number;
    imagesrc: { src: string };
    id:string;
    imageUrl:string,
    description: string | undefined;
    price: number | string;
    rating: number | string;
    reviews: string;
    url: string;
    category?: string;
    nutrient?: {
      regular: { cals: string; protein: string; fat: string; carbs: string,price:string };
      jumbo: { cals: string; protein: string; fat: string; carbs: string ,price:string};
    };
    proteinVariants?: ProteinVariant[]; // Optional: for items with protein choices
    selectedProtein?: string; // Selected protein variant name
    selectedSize?: "regular" | "jumbo"; // Selected size variant
  }
  export interface addOnsItem {
    type: string;
    value: Array<{
      item: string;
      imagesrc: { src: string };
      nutrient?: {
        regular: { cals: string; protein: string; fat: string; carbs: string };
        jumbo: { cals: string; protein: string; fat: string; carbs: string };
      };
    }>;
  }
  export interface PreOrderMenuItem {
    tabName:string;
    title?: string;
    imagesrc?: { src: string };
    description?: string;
    category?: string;
    nutrient?: {
      cals: string;
      protein: string;
      fat: string;
      carbs: string;
    };
    addOns?: Array<addOnsItem>;
    specificAddons?: Array<addOnsItem>;
  }