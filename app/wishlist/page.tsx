import { FavoritesView } from "@/components/account-pages";
import { Breadcrumb } from "@/components/ui";
export default function WishlistPage() { return <main className="bt-container bt-page"><Breadcrumb items={[{ label: "Sản phẩm yêu thích" }]} /><FavoritesView /></main>; }
