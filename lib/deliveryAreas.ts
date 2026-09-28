export type DeliveryArea = {
  name: string;
  pincode: string;
};

export const DELIVERY_AREAS: DeliveryArea[] = [
  { name: "Valasaravakkam", pincode: "600087" },
  { name: "Alwarthirunagar", pincode: "600087" },
  { name: "Virugambakkam", pincode: "600092" },
  { name: "Porur", pincode: "600116" },
  { name: "Karambakkam", pincode: "600125" },
  { name: "Maduravoyal", pincode: "600095" },
  { name: "Vanagaram", pincode: "600095" },
];

export function getDeliveryArea(name: string): DeliveryArea | undefined {
  return DELIVERY_AREAS.find((area) => area.name === name);
}
