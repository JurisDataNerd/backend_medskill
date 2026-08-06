/**
 * Category entity (database model)
 */
export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon_url: string | null;
    is_active: boolean;
    sort_order: number;
}

/**
 * Payload ketika membuat category baru
 */
export interface CreateCategoryDto {
    name: string;
    slug: string;
    description?: string;
    icon_url?: string;
    sort_order?: number;
}

/**
 * Payload ketika mengupdate category
 * Seluruh field optional karena update bersifat partial.
 */
export interface UpdateCategoryDto {
    name?: string;
    slug?: string;
    description?: string;
    icon_url?: string;
    is_active?: boolean;
    sort_order?: number;
}

/**
 * Response list category
 */
export interface CategoryListResponse {
    data: Category[];
    total: number;
}

/**
 * Response single category
 */
export interface CategoryResponse {
    data: Category;
}