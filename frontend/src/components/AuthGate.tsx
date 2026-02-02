import { useEffect, useState, type ReactNode } from "react";
import { useGetAuthStatusQuery, useLoginMutation } from "@/store/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/pages/components/PageLoading";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { data: status, isLoading } = useGetAuthStatusQuery();
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (status?.username) {
      setUsername(status.username);
    }
  }, [status?.username]);

  if (isLoading || !status) {
    return <PageLoading message="Checking authentication..." />;
  }

  if (!status.enabled || status.authenticated) {
    return <>{children}</>;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !password) {
      toast.error("Username and password are required");
      return;
    }
    try {
      await login({ username, password }).unwrap();
      setPassword("");
    } catch (error) {
      toast.error("Login failed", {
        description: getApiErrorMessage(error),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Enter your credentials to access the SnapRAID Web UI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="auth-login-username">Username</Label>
              <Input
                id="auth-login-username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-login-password">Password</Label>
              <Input
                id="auth-login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
