import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Button,
  type Key,
  Tag,
  TagGroup,
  TagList,
} from "react-aria-components";
import { ComboBox, ComboBoxItem } from "./ComboBox";
import "./TagPicker.css";

export interface TagPickerItem {
  id: Key;
  name: string;
}

export interface TagPickerProps {
  label: string;
  items: TagPickerItem[];
  selectedKeys: Key[];
  onSelectionChange: (keys: Key[]) => void;
  markedKeys?: Key[];
  markLabel?: string;
  description?: ReactNode;
  errorMessage?: string;
  placeholder?: string;
}

export function TagPicker({
  label,
  items,
  selectedKeys,
  onSelectionChange,
  markedKeys = [],
  markLabel,
  description,
  errorMessage,
  placeholder = "Søk og velg",
}: TagPickerProps) {
  const [inputValue, setInputValue] = useState("");
  const [committedKey, setCommittedKey] = useState<Key | null>(null);

  const selectedItems = useMemo(
    () =>
      selectedKeys
        .map((key) => items.find((item) => item.id === key))
        .filter((item): item is TagPickerItem => item !== undefined),
    [items, selectedKeys],
  );

  const availableItems = useMemo(
    () => items.filter((item) => !selectedKeys.includes(item.id)),
    [items, selectedKeys],
  );

  useEffect(() => {
    if (committedKey !== null) {
      setCommittedKey(null);
    }
  }, [committedKey]);

  const add = (key: Key | null) => {
    if (key === null || selectedKeys.includes(key)) {
      return;
    }
    onSelectionChange([...selectedKeys, key]);
    setCommittedKey(key);
    setInputValue("");
  };

  const remove = (keys: Set<Key>) => {
    onSelectionChange(selectedKeys.filter((key) => !keys.has(key)));
  };

  const isMarked = (key: Key) => markedKeys.includes(key);

  return (
    <div className="tag-picker">
      <ComboBox
        label={label}
        items={availableItems}
        selectedKey={committedKey}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSelectionChange={add}
        description={description}
        isInvalid={errorMessage !== undefined && errorMessage !== ""}
        errorMessage={errorMessage}
        placeholder={placeholder}
        allowsEmptyCollection
      >
        {(item) => <ComboBoxItem>{item.name}</ComboBoxItem>}
      </ComboBox>
      {selectedItems.length > 0 && (
        <TagGroup
          aria-label={`Valgte ${label.toLowerCase()}`}
          onRemove={remove}
          selectionMode="none"
        >
          <TagList items={selectedItems}>
            {(item) => (
              <Tag
                textValue={
                  isMarked(item.id) && markLabel
                    ? `${item.name} (${markLabel})`
                    : item.name
                }
              >
                <span>{item.name}</span>
                {isMarked(item.id) && markLabel && (
                  <span className="tag-picker-mark">{markLabel}</span>
                )}
                <Button slot="remove">
                  <span aria-hidden="true">×</span>
                </Button>
              </Tag>
            )}
          </TagList>
        </TagGroup>
      )}
    </div>
  );
}
