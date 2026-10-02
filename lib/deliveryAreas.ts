export type DeliveryArea = {
  id: string;
  name: string;
  pincode: string;
};

export const DELIVERY_AREAS: DeliveryArea[] = [
  { id: "dlf-cybercity-porur", name: "DLF Cybercity Porur", pincode: "600116" },
  { id: "one-paramount-porur", name: "One Paramount Porur", pincode: "600116" },
  { id: "lt-porur", name: "L&T Porur", pincode: "600116" },
  { id: "commerzone-porur", name: "Commerzone Porur", pincode: "600116" },
  { id: "srm-vadapalani", name: "SRM Vadapalani", pincode: "600026" },
  { id: "srm-ramapuram", name: "SRM Ramapuram", pincode: "600089" },
  { id: "meenakshi-dental-college", name: "Meenakshi Dental College", pincode: "600095" },
  { id: "ramachandra-medical-college", name: "Ramachandra Medical College", pincode: "600116" },
];

export function getDeliveryArea(name: string): DeliveryArea | undefined {
  return DELIVERY_AREAS.find((area) => area.name === name);
}

export function getDeliveryAreaById(id: string): DeliveryArea | undefined {
  return DELIVERY_AREAS.find((area) => area.id === id);
}
