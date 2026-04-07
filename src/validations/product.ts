import { z } from "zod";

export const productFormSchema = z.object({
  artist: z.string().min(1, "Artist is required").max(255),
  title: z.string().min(1, "Title is required").max(255),
  format: z.enum(["vinyl", "cassette", "cd"], { required_error: "Format is required" }),
  genre: z.string().min(1, "Genre is required").max(100),
  priceCents: z.coerce.number().int().min(0, "Price must be 0 or more"),
  stockQuantity: z.coerce.number().int().min(0, "Stock must be 0 or more"),
  conditionMedia: z.enum(["M", "NM", "VG+", "VG", "G", "P"]).nullable(),
  conditionSleeve: z.enum(["M", "NM", "VG+", "VG", "G", "P"]).nullable(),
  pressingLabel: z.string().max(255).nullable(),
  pressingYear: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 5).nullable(),
  pressingCatalogNumber: z.string().max(100).nullable(),
  description: z.string().min(1, "Description is required"),
  imageUrls: z.array(z.string().url()).min(1, "At least one image is required"),
});

export type ProductFormData = z.infer<typeof productFormSchema>;
