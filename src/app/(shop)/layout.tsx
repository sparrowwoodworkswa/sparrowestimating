import "./shop.css";
import { ShopNav } from "@/components/shop/ShopNav";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sw">
      {/* Inter, per the Sparrow design system */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" />
      <header className="sw-head">
        <a href="/shop" className="sw-lockup" aria-label="Sparrow Woodworks shop estimating">
          <img src="/brand/logo-bird.png" alt="" />
          <span>Sparrow Woodworks</span>
        </a>
        <div className="sw-desc">
          Shop estimating
          <br />
          Cabinetry and millwork
        </div>
      </header>
      <ShopNav />
      <main className="sw-main">{children}</main>
    </div>
  );
}
