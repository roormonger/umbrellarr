import {
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { login, setAuthStatusCache } from "@/api/auth";
import { allLibrarySearch } from "@/lib/librarySearch";
import { ApiError } from "@/api/client";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await login(password);
      setAuthStatusCache(queryClient, { authenticated: true, authRequired: true });
      await navigate({ to: "/movies", search: allLibrarySearch });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Login failed";
      notifications.show({ color: "red", title: "Login failed", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder p="xl" w={380} radius="md">
        <form onSubmit={onSubmit}>
          <Stack>
            <div>
              <Title order={2}>Umbrellarr</Title>
              <Text c="dimmed" size="sm">
                Enter the app password to continue
              </Text>
            </div>
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              autoFocus
            />
            <Button type="submit" loading={loading}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
