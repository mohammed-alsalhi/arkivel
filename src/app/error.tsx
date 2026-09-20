"use client";

import { useEffect } from "react";
import { Button, EmptyState, LinkButton, Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Page trail={[TRAIL_ROOTS.library, { label: "error" }]}>
      <PageHeader title="something went wrong" />
      <EmptyState
        title="this page hit an unexpected error."
        description={
          error.digest ? (
            <>
              the error has been logged
              {" "}
              (reference <code className="ui-inline-code">{error.digest}</code>).
            </>
          ) : (
            "the error has been logged."
          )
        }
        actions={
          <>
            <Button variant="primary" onClick={reset}>
              try again
            </Button>
            <LinkButton href="/">go to the main page</LinkButton>
          </>
        }
      />
    </Page>
  );
}
