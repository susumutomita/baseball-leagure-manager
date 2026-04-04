"use client";

import Spinner from "@cloudscape-design/components/spinner";

export default function ManagerLoading() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "400px",
      }}
    >
      <Spinner size="large" />
    </div>
  );
}
