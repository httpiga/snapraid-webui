import { type ReactNode } from "react";
import { useGetAuthStatusQuery } from "@/store/api";
import { getAuthGateState } from "@/lib/auth-guard";
import { PageLoading } from "@/pages/components/PageLoading";
import { Login } from "@/pages/Login";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const {
    data: status,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAuthStatusQuery();

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to verify authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {getApiErrorMessage(error)}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gateState = getAuthGateState(isLoading, status);

  if (gateState === "loading") {
    return <PageLoading message="Checking authentication..." />;
  }

  if (gateState === "login") {
    return <Login onSuccess={refetch} />;
  }

  return <>{children}</>;
}
