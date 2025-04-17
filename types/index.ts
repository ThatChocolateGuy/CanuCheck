export interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    url: string;
    description: string;
    countries: {
      code: string;
      name: string;
      percentage: number;
    }[];
    canadianPercentage: number;
  }