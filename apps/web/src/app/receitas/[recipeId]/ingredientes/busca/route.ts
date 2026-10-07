import { getCurrentUser } from "@/lib/auth/session";
import { searchAccessibleIngredients } from "@/lib/ingredients/repository";
import { findRecipe } from "@/lib/recipes/repository";

export async function GET(request: Request, { params }: { params: Promise<{ recipeId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Entre com sua conta para continuar." }, { status: 401, headers });
  const { recipeId } = await params;
  if (!await findRecipe(user.id, recipeId)) return Response.json({ error: "Receita não encontrada." }, { status: 404, headers });
  const query = new URL(request.url).searchParams;
  const search = (query.get("q") ?? "").trim();
  const pageText = query.get("page") ?? "0";
  if (search.length > 120 || !/^\d{1,4}$/.test(pageText) || Number(pageText) > 1000) {
    return Response.json({ error: "Revise a busca." }, { status: 400, headers });
  }
  try {
    return Response.json(await searchAccessibleIngredients(user.id, search, Number(pageText)), { headers });
  } catch {
    return Response.json({ error: "Não foi possível buscar ingredientes. Tente novamente." }, { status: 503, headers });
  }
}
