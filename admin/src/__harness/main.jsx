/* Dev-only harness: renders each content page against an in-memory stand-in
   for Supabase so the components can be exercised without a live database or
   a login. Never imported by src/main.jsx, so it is not in the production
   bundle. */
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "../styles/admin.css";

import Navigation from "../pages/Navigation.jsx";
import Offices from "../pages/Offices.jsx";
import Contact from "../pages/Contact.jsx";
import Media from "../pages/Media.jsx";
import Audit from "../pages/Audit.jsx";
import GalleryEditor from "../components/GalleryEditor.jsx";
import Activity from "../pages/Activity.jsx";
import People from "../pages/People.jsx";
import GiftReq from "../pages/Gifts.jsx";
import { useState } from "react";

function Gallery() {
  const [m, setM] = useState({
    gallery: ["img/pieces/weaver/p1.webp", "img/pieces/weaver/p2.webp"],
    models: ["img/pieces/weaver/m1.webp"],
    focal: { "img/pieces/weaver/p2.webp": 99 },
  });
  return (
    <div className="panel">
      <GalleryEditor {...m} onChange={(n) => setM((x) => ({ ...x, ...n }))}
                     storefront="http://localhost:8777/high-jewellery/" />
    </div>
  );
}

const which = new URLSearchParams(location.search).get("page") || "navigation";
const Pages = { navigation: Navigation, offices: Offices, contact: Contact, media: Media, audit: Audit, gallery: Gallery, activity: Activity, people: People, giftreq: GiftReq };
const Page = Pages[which] || Navigation;

createRoot(document.getElementById("root")).render(
  <MemoryRouter><div className="page"><Page /></div></MemoryRouter>
);
