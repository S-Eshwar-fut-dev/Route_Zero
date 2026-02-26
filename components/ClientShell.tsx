"use client";

import { FleetProvider } from "@/lib/FleetContext";
import AppShell from "@/components/AppShell";
import ChatDrawer from "@/components/ChatDrawer";
import type { ReactNode } from "react";

export default function ClientShell({ children }: { children: ReactNode }) {
    return (
        <FleetProvider>
            <AppShell>{children}</AppShell>
            <ChatDrawer />
        </FleetProvider>
    );
}
