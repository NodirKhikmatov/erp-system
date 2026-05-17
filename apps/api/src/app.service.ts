import { Injectable } from "@nestjs/common";

import { t } from "./i18n/messages";
import { getRequestLocale } from "./i18n/request-locale.storage";

@Injectable()
export class AppService {
  getRoot(): { nomi: string; tekshiruv: string; hujjatlar: string } {
    const lang = getRequestLocale();
    return {
      nomi: t(lang, "root.name"),
      tekshiruv: "/salomatlik/jonli",
      hujjatlar: "/hujjatlar",
    };
  }
}
