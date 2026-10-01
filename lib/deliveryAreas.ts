export type DeliveryArea = {
  name: string;
  pincode: string;
};

export const DELIVERY_AREAS: DeliveryArea[] = [
  { name: "DLF Cybercity Porur", pincode: "600116" },
  { name: "One Paramount Porur", pincode: "600116" },
  { name: "L&T Porur", pincode: "600116" },
  { name: "Commerzone Porur", pincode: "600116" },
  { name: "SRM Vadapalani", pincode: "600026" },
  { name: "SRM Ramapuram", pincode: "600089" },
  { name: "Meenakshi Dental College", pincode: "600095" },
  { name: "Ramachandra Medical College", pincode: "600116" },
];

export function getDeliveryArea(name: string): DeliveryArea | undefined {
  return DELIVERY_AREAS.find((area) => area.name === name);
}
