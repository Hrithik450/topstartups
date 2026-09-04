"use client";

import React from "react";
import { useErrorStore } from "@/store/error-store";
import { SuccessAlert } from "@/components/alerts/success";
import { FailureAlert } from "@/components/alerts/failure";

export function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status, message } = useErrorStore();

  return (
    <>
      {children}
      {status === "saved" && message && <SuccessAlert message={message} duration={4000} />}
      {status === "error" && message && <FailureAlert message={message} duration={4000} />}
    </>
  );
}

export default LayoutWrapper;
