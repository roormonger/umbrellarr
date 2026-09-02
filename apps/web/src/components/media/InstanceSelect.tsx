import { Select } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { InstanceKind } from "@umbrellarr/shared";
import { useEffect } from "react";
import { listInstances } from "@/api/instances";
import { setLastInstanceId } from "@/lib/lastInstance";

type Props = {
  kind: InstanceKind;
  instanceId: string;
  hrefFor: (instanceId: string) => string;
};

export function InstanceSelect({ kind, instanceId, hrefFor }: Props) {
  const navigate = useNavigate();
  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (instanceId) setLastInstanceId(kind, instanceId);
  }, [kind, instanceId]);

  const options = (instancesQuery.data?.instances ?? []).filter((instance) => instance.kind === kind);
  if (options.length < 2) return null;

  return (
    <div data-instance-select={kind}>
      <Select
        size="sm"
        w={180}
        allowDeselect={false}
        aria-label="Instance"
        data={options.map((instance) => ({ value: instance.id, label: instance.name }))}
        value={instanceId}
        onChange={(value) => {
          if (!value || value === instanceId) return;
          setLastInstanceId(kind, value);
          void navigate({ to: hrefFor(value) });
        }}
      />
    </div>
  );
}
