import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginMutation } from "@/store/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";

type LoginProps = {
  onSuccess: () => void;
};

export function Login({ onSuccess }: LoginProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [login, { isLoading }] = useLoginMutation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      toast.error("Username and password are required");
      return;
    }

    try {
      await login({ username: username.trim(), password }).unwrap();
      toast.success("Logged in");
      setPassword("");
      onSuccess();
    } catch (error) {
      toast.error("Login failed", {
        description: getApiErrorMessage(error),
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
