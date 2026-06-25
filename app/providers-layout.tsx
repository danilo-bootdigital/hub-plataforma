"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ClientProviders } from "@/components/client-providers";

interface ProvidersLayoutProps {
  children: ReactNode;
  authData?: {
    user: any;
    profile: any;
  };
}

export default function ProvidersLayout({ children, authData }: ProvidersLayoutProps) {
  return (
    <ClientProviders>
      <AuthProvider initialUser={authData?.user} initialProfile={authData?.profile}>
        {children}
      </AuthProvider>
    </ClientProviders>
  );
}