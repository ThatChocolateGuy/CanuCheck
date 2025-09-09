export {}; // Ensure this file is treated as a module

// Augment NodeJS.ProcessEnv instead of declaring global
declare namespace NodeJS {
    interface ProcessEnv {
        OPENAI_API_KEY: string
    }
}

interface EcommerceProduct {
    id: string
    name: string
    price: number
    images?: Array<string>
    url: string
    manufacturer?: string
    description: string
    available?: boolean
}

interface LLMProductResult {
    products: Array<EcommerceProduct>
}

export type { EcommerceProduct, LLMProductResult }

export {} // Ensure this file is treated as a module