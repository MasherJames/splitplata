import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { toCSV, toSummaryHtml, type Group } from "@splitplata/core";

const slug = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "group";

/** Write the group's CSV to a temp file and open the OS share sheet. */
export async function exportCSV(group: Group): Promise<void> {
  const uri = `${FileSystem.cacheDirectory}${slug(group.name)}.csv`;
  await FileSystem.writeAsStringAsync(uri, toCSV(group), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
      dialogTitle: `${group.name} (CSV)`,
    });
  }
}

/** Render the HTML summary to a PDF via expo-print, then share it. */
export async function exportPDF(group: Group): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: toSummaryHtml(group) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: `${group.name} (PDF)`,
    });
  }
}
