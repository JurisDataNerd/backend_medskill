import supabase from "../../utils/supabase";
import {
    Category,
    CreateCategoryDto,
    UpdateCategoryDto,
} from "../types/category";

class CategoryService {
    /**
     * Get all categories
     */
    async getAll(): Promise<Category[]> {
        const { data, error } = await supabase
            .from("product_categories")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

        if (error) {
            throw new Error(error.message);
        }

        return data as Category[];
    }

    /**
     * Get category by ID
     */
    async getById(id: string): Promise<Category | null> {
        const { data, error } = await supabase
            .from("product_categories")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return null;
            }

            throw new Error(error.message);
        }

        return data as Category;
    }

    /**
     * Create new category
     */
    async create(payload: CreateCategoryDto): Promise<Category> {
        const { data, error } = await supabase
            .from("product_categories")
            .insert({
                name: payload.name,
                slug: payload.slug,
                description: payload.description ?? null,
                icon_url: payload.icon_url ?? null,
                sort_order: payload.sort_order ?? 0,
            })
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return data as Category;
    }

    /**
     * Update category
     */
    async update(
        id: string,
        payload: UpdateCategoryDto
    ): Promise<Category | null> {
        const { data, error } = await supabase
            .from("product_categories")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return null;
            }

            throw new Error(error.message);
        }

        return data as Category;
    }

    /**
     * Delete category
     */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from("product_categories")
            .delete()
            .eq("id", id);

        if (error) {
            throw new Error(error.message);
        }
    }
}

export default new CategoryService();