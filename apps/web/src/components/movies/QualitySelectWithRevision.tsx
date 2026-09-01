import { Checkbox, Combobox, Group, InputBase, useCombobox } from "@mantine/core";
import { useMemo, useState } from "react";
import classes from "./QualitySelectWithRevision.module.css";

type QualityOption = {
  value: string;
  label: string;
};

type Props = {
  options: QualityOption[];
  value: string | null;
  proper: boolean;
  real: boolean;
  onQualityChange: (value: string | null) => void;
  onProperChange: (value: boolean) => void;
  onRealChange: (value: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
};

function closedLabel(label: string, proper: boolean, real: boolean): string {
  if (!label) return "";
  const parts = [label];
  if (proper) parts.push("Proper");
  if (real) parts.push("Real");
  return parts.join(" · ");
}

export function QualitySelectWithRevision({
  options,
  value,
  proper,
  real,
  onQualityChange,
  onProperChange,
  onRealChange,
  placeholder = "Quality",
  disabled,
}: Props) {
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
      setFilterActive(false);
    },
  });

  const [search, setSearch] = useState("");
  /** Only filter after the user edits search — opening with the selected label must show the full list. */
  const [filterActive, setFilterActive] = useState(false);

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label ?? "",
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!filterActive) return options;
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [filterActive, options, search]);

  const displayValue = combobox.dropdownOpened
    ? search
    : closedLabel(selectedLabel, proper, real);

  function openDropdown() {
    if (disabled) return;
    combobox.openDropdown();
    setSearch(selectedLabel);
    setFilterActive(false);
  }

  return (
    <Combobox
      store={combobox}
      withinPortal
      onOptionSubmit={(next) => {
        onQualityChange(next);
        setSearch(options.find((option) => option.value === next)?.label ?? "");
        setFilterActive(false);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          size="xs"
          pointer
          disabled={disabled}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          value={displayValue}
          placeholder={placeholder}
          styles={{
            input: {
              cursor: "pointer",
              minHeight: "var(--input-height-xs)",
              height: "var(--input-height-xs)",
            },
          }}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setFilterActive(true);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={(event) => {
            openDropdown();
            event.currentTarget.select();
          }}
          onFocus={(event) => {
            openDropdown();
            event.currentTarget.select();
          }}
          onBlur={() => {
            combobox.closeDropdown();
            setSearch("");
            setFilterActive(false);
          }}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={220} style={{ overflowY: "auto" }}>
          {filtered.length > 0 ? (
            filtered.map((option) => (
              <Combobox.Option
                value={option.value}
                key={option.value}
                active={option.value === value}
              >
                {option.label}
              </Combobox.Option>
            ))
          ) : (
            <Combobox.Empty>No qualities found</Combobox.Empty>
          )}
        </Combobox.Options>

        <Combobox.Footer className={classes.footer}>
          <Group gap="md" wrap="nowrap">
            <Checkbox
              size="xs"
              label="Proper"
              checked={proper}
              onChange={(event) => onProperChange(event.currentTarget.checked)}
            />
            <Checkbox
              size="xs"
              label="Real"
              checked={real}
              onChange={(event) => onRealChange(event.currentTarget.checked)}
            />
          </Group>
        </Combobox.Footer>
      </Combobox.Dropdown>
    </Combobox>
  );
}
