package com.sdr.srushtiai;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "PdfOpener")
public class PdfOpenerPlugin extends Plugin {

    @PluginMethod
    public void openPdf(PluginCall call) {
        String base64Data = call.getString("base64");
        String filename = call.getString("filename", "document.pdf");

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("No PDF data provided");
            return;
        }

        try {
            // Strip data URI prefix if present (e.g. data:application/pdf;base64,...)
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }
            // Remove any whitespace or newline characters
            base64Data = base64Data.replaceAll("\\s+", "");

            byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);

            Context context = getContext();
            File docsDir = new File(context.getCacheDir(), "documents");
            if (!docsDir.exists()) {
                docsDir.mkdirs();
            }

            // Sanitize filename
            if (filename == null || filename.trim().isEmpty()) {
                filename = "document.pdf";
            }
            filename = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
            if (!filename.toLowerCase().endsWith(".pdf")) {
                filename = filename + ".pdf";
            }

            File pdfFile = new File(docsDir, filename);
            FileOutputStream fos = new FileOutputStream(pdfFile);
            fos.write(pdfBytes);
            fos.flush();
            fos.close();

            String authority = context.getPackageName() + ".fileprovider";
            Uri contentUri = FileProvider.getUriForFile(context, authority, pdfFile);

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, "application/pdf");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Intent chooser = Intent.createChooser(intent, "Open with Drive PDF Viewer or default app");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getActivity().startActivity(chooser);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("path", pdfFile.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open PDF with default viewer: " + e.getMessage(), e);
        }
    }
}
