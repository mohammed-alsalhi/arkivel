"use client";

import { useState } from "react";
import {
  AnchorButton,
  Button,
  Page,
  PageHeader,
  SectionPanel,
  Textarea,
} from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function BookmarkletPage() {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  // Build the bookmarklet code with the current origin baked in
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Minified bookmarklet source
  const bookmarkletCode = `javascript:(function(){
var sel=window.getSelection?window.getSelection().toString():"";
var title=document.title||location.href;
var payload=JSON.stringify({url:location.href,title:title,selectedText:sel});
fetch("${origin}/api/bookmarklet",{
  method:"POST",
  credentials:"include",
  headers:{"Content-Type":"application/json"},
  body:payload
}).then(function(r){return r.json()}).then(function(d){
  if(d.slug){
    var ok=confirm("Saved as draft: "+d.title+". Open editor now?");
    if(ok)window.open("${origin}/articles/"+d.slug+"/edit","_blank");
  } else {
    alert("Error: "+(d.error||"Unknown error"));
  }
}).catch(function(e){alert("Save failed: "+e.message)});
})();`.replace(/\s+/g, " ").trim();

  function copyCode() {
    navigator.clipboard.writeText(bookmarkletCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Page>
      <PageHeader
        title="Save to wiki — Bookmarklet"
        description="Add the bookmarklet below to your browser. When you click it on any webpage, it saves the current page or selected text as a draft article in this wiki."
      />

      <SectionPanel className="mb-6" title="Install">
        <p className="text-[12px] text-muted mb-3">
          <strong>Option A — drag and drop:</strong> Drag the button below to your bookmarks bar.
        </p>
        <AnchorButton
          href={bookmarkletCode}
          onClick={(e) => {
            e.preventDefault();
            addToast("Drag this button to your bookmarks bar — don't click it here.", "info");
          }}
          title="Drag me to your bookmarks bar"
          variant="primary"
        >
          Save to wiki
        </AnchorButton>

        <p className="text-[12px] text-muted mt-4 mb-2">
          <strong>Option B — manual install:</strong> Copy the code, create a new bookmark manually,
          and paste it as the URL.
        </p>
        <div className="flex gap-2 items-start">
          <Textarea readOnly value={bookmarkletCode} rows={4} className="flex-1 font-mono" />
          <Button onClick={copyCode} className="shrink-0">
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </SectionPanel>

      <SectionPanel className="mb-4" title="How it works" bodyClassName="text-[12px] space-y-1">
        <p>1. Navigate to any webpage you want to save.</p>
        <p>2. Optionally, select some text to clip just that portion.</p>
        <p>3. Click the <strong>Save to wiki</strong> bookmarklet.</p>
        <p>4. The page (or selection) is saved as a <strong>draft article</strong>.</p>
        <p>5. You are offered to open the editor to review and publish it.</p>
        <p className="text-muted pt-1">
          You must be logged in to this wiki in the same browser for the save to succeed.
        </p>
      </SectionPanel>
    </Page>
  );
}

export const dynamic = "force-dynamic";
