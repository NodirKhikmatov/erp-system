import { redirect } from "next/navigation";

import { defaultLocale } from "@/i18n/config";

/** `/` — til prefiksisiz kirish; doim standart tilga yo‘naltiriladi. */
export default function RootRedirectPage() {
  redirect(`/${defaultLocale}`);
}
