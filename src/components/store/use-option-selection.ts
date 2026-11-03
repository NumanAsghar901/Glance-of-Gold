"use client";

import { useMemo, useState } from "react";
import { cartActions, type CartOptionChoice } from "@/lib/cart-store";
import type { OptionGroup, ProductDetail } from "@/lib/data/types";
import { composeOptionLabel } from "@/lib/option-label";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";

export type Kind = "size" | "colour";

/** One line representing a completed variant unit choice with its quantity. */
export type SelectedLine = {
  key: string;
  groupId: number | null;
  group: string | null;
  size: string | null;
  colour: string | null;
  qty: number;
  label: string;
};

export type ConfiguredUnit = {
  id: string;
  options: CartOptionChoice[];
  label: string;
  qty: number;
};

type ChosenGroup = { size: string | null; colour: string | null };

export type GroupView = {
  group: OptionGroup;
  kinds: { kind: Kind; label: string; values: string[]; chosen: string | null }[];
};

let unitCounter = 1;

/**
 * Everything a product page or quick view needs to let a customer customize and buy the product:
 *
 * - A product can have variant groups (e.g. "Nose Ring 1" and "Nose Ring 2").
 * - Each variant group is displayed separately: customer selects exactly one size and one color per variant.
 * - All variant selections in a unit are mandatory.
 * - Both/all variants in a unit are included in the product's displayed price.
 * - Customers can make multiple selections with different sizes and colours via "Make another selection".
 * - Total price = Product Price × Total Quantity across all selections.
 */
export function useOptionSelection(product: ProductDetail) {
  const groups = useMemo(() => product.groups.filter((g) => g.sizes.length + g.colours.length > 0), [product.groups]);
  const hasGroups = groups.length > 0;

  // Saved units that the customer has already completed via "+ Make another selection"
  const [savedUnits, setSavedUnits] = useState<ConfiguredUnit[]>([]);
  // The selection currently being edited in the picker
  const [currentChosen, setCurrentChosen] = useState<Record<number, ChosenGroup>>({});
  const [currentQty, setCurrentQty] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plainQty, setPlainQty] = useState(1);

  const stock = product.stock;
  const soldOut = stock < 1;

  const views: GroupView[] = useMemo(() => {
    return groups.map((g) => ({
      group: g,
      kinds: [
        ...(g.sizes.length ? [{ kind: "size" as const, label: "Size", values: g.sizes, chosen: currentChosen[g.id]?.size ?? null }] : []),
        ...(g.colours.length ? [{ kind: "colour" as const, label: "Colour", values: g.colours, chosen: currentChosen[g.id]?.colour ?? null }] : []),
      ],
    }));
  }, [groups, currentChosen]);

  /** True when all configured variant groups in the active picker have their required options selected. */
  const currentAllSelected = useMemo(() => {
    if (!hasGroups) return true;
    return groups.every((g) => {
      const c = currentChosen[g.id];
      const sizeOk = g.sizes.length === 0 || !!c?.size;
      const colourOk = g.colours.length === 0 || !!c?.colour;
      return sizeOk && colourOk;
    });
  }, [hasGroups, groups, currentChosen]);

  /** True if the user has touched/selected at least one option in the active picker. */
  const currentHasAnyPicks = useMemo(() => {
    return Object.values(currentChosen).some((c) => !!c.size || !!c.colour);
  }, [currentChosen]);

  /** Options array of the current active selection. */
  const currentOptions: CartOptionChoice[] = useMemo(() => {
    if (!hasGroups) return [];
    return groups.map((g) => ({
      group: g.heading,
      size: currentChosen[g.id]?.size ?? null,
      colour: currentChosen[g.id]?.colour ?? null,
    }));
  }, [hasGroups, groups, currentChosen]);

  const currentLabel = useMemo(() => {
    if (!hasGroups) return "";
    return composeOptionLabel({ options: currentOptions });
  }, [hasGroups, currentOptions]);

  /** All completed selection units (saved units + currently completed active selection). */
  const allUnits: ConfiguredUnit[] = useMemo(() => {
    if (!hasGroups) {
      return [{ id: "plain", options: [], label: "", qty: plainQty }];
    }
    const units = [...savedUnits];
    if (currentAllSelected && currentOptions.length > 0) {
      units.push({
        id: editingId ?? "active",
        options: currentOptions,
        label: currentLabel,
        qty: currentQty,
      });
    }
    return units;
  }, [hasGroups, plainQty, savedUnits, currentAllSelected, currentOptions, currentLabel, currentQty, editingId]);

  const totalQty = useMemo(() => {
    if (soldOut) return 0;
    if (!hasGroups) return plainQty;
    return allUnits.reduce((n, u) => n + u.qty, 0);
  }, [soldOut, hasGroups, plainQty, allUnits]);

  const pieces = totalQty;
  const total = totalQty * product.price;
  const overStock = totalQty > stock;
  const allSelected = allUnits.length > 0;
  const canAdd = !soldOut && allSelected && !overStock && totalQty >= 1;

  /** What option is still needed in the active selection, if incomplete. */
  const missing: string | null = useMemo(() => {
    if (!hasGroups) return null;
    // If all units are complete and active is empty or complete, nothing is missing
    if (currentAllSelected) return null;
    if (savedUnits.length > 0 && !currentHasAnyPicks) return null;

    for (const g of groups) {
      const c = currentChosen[g.id];
      const needSize = g.sizes.length > 0 && !c?.size;
      const needColour = g.colours.length > 0 && !c?.colour;
      if (needSize && needColour) return `a size and colour for ${g.heading}`;
      if (needSize) return `a size for ${g.heading}`;
      if (needColour) return `a colour for ${g.heading}`;
    }
    return "an option";
  }, [hasGroups, currentAllSelected, savedUnits.length, currentHasAnyPicks, groups, currentChosen]);

  const lines: SelectedLine[] = useMemo(() => {
    if (soldOut) return [];
    if (!hasGroups) {
      return [{ key: "plain", groupId: null, group: null, size: null, colour: null, qty: plainQty, label: "" }];
    }
    return allUnits.map((u) => ({
      key: u.id,
      groupId: null,
      group: null,
      size: null,
      colour: null,
      qty: u.qty,
      label: u.label,
    }));
  }, [soldOut, hasGroups, plainQty, allUnits]);

  /** Toggles a size or colour in the active selection. */
  function toggle(groupId: number, kind: Kind, value: string) {
    setCurrentChosen((cur) => {
      const prev = cur[groupId] ?? { size: null, colour: null };
      const nextVal = prev[kind] === value ? null : value;
      return {
        ...cur,
        [groupId]: {
          ...prev,
          [kind]: nextVal,
        },
      };
    });
  }

  /**
   * Commits the current active selection to `savedUnits` and opens a fresh picker
   * so the customer can make another selection for different sizes and colours.
   */
  function addUnit() {
    if (!currentAllSelected) return;

    const newUnit: ConfiguredUnit = {
      id: `unit-${Date.now()}-${unitCounter++}`,
      options: currentOptions,
      label: currentLabel,
      qty: currentQty,
    };

    if (editingId) {
      // Finished editing an existing unit
      setSavedUnits((prev) => [...prev, newUnit]);
      setEditingId(null);
    } else {
      setSavedUnits((prev) => [...prev, newUnit]);
    }

    // Reset picker for the next selection
    setCurrentChosen({});
    setCurrentQty(1);
  }

  /** Loads a saved unit back into the active picker to edit its options. */
  function editUnit(id: string) {
    const target = savedUnits.find((u) => u.id === id);
    if (!target) return;

    // Remove from saved units while editing
    setSavedUnits((prev) => prev.filter((u) => u.id !== id));
    setEditingId(id);

    // Populate currentChosen from the unit's options
    const newChosen: Record<number, ChosenGroup> = {};
    for (const g of groups) {
      const opt = target.options.find((o) => o.group === g.heading);
      newChosen[g.id] = {
        size: opt?.size ?? null,
        colour: opt?.colour ?? null,
      };
    }
    setCurrentChosen(newChosen);
    setCurrentQty(target.qty);
  }

  /** Removes a saved unit from the selection list. */
  function removeUnit(id: string) {
    setSavedUnits((prev) => prev.filter((u) => u.id !== id));
  }

  /** Cancels editing or adding a new unit and restores the last saved unit into the picker. */
  function cancelNewUnit() {
    if (savedUnits.length === 0) return;
    const last = savedUnits[savedUnits.length - 1];
    setSavedUnits((prev) => prev.slice(0, -1));
    editUnit(last.id);
  }

  /** Adjusts quantity for a specific saved unit. */
  function stepUnitQty(id: string, delta: 1 | -1) {
    setSavedUnits((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const nextQty = Math.max(1, Math.min(u.qty + delta, stock, MAX_QTY_PER_LINE));
        return { ...u, qty: nextQty };
      }),
    );
  }

  /** Adjusts quantity of the current active selection (or plain product). */
  function stepQty(arg1: string | 1 | -1, arg2?: 1 | -1) {
    const delta = typeof arg1 === "number" ? arg1 : (arg2 ?? 1);
    if (!hasGroups) {
      setPlainQty((q) => Math.max(1, Math.min(q + delta, stock, MAX_QTY_PER_LINE)));
      return;
    }
    setCurrentQty((q) => Math.max(1, Math.min(q + delta, stock, MAX_QTY_PER_LINE)));
  }

  /** Adds all configured units to the cart. Returns total pieces added. */
  function add() {
    if (!canAdd) return 0;

    for (const unit of allUnits) {
      cartActions.add(
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          options: unit.options.length > 0 ? unit.options : null,
          group: unit.options[0]?.group ?? null,
          size: unit.options[0]?.size ?? null,
          colour: unit.options[0]?.colour ?? null,
          price: product.price,
          image: product.images[0]?.url ?? null,
          stock,
        },
        unit.qty,
      );
    }

    return totalQty;
  }

  return {
    hasGroups,
    views,
    savedUnits,
    currentChosen,
    currentQty,
    currentAllSelected,
    currentHasAnyPicks,
    editingId,
    lines,
    qty: totalQty,
    totalQty,
    pieces,
    total,
    stock,
    soldOut,
    overStock,
    allSelected,
    canAdd,
    missing,
    toggle,
    addUnit,
    editUnit,
    removeUnit,
    cancelNewUnit,
    stepUnitQty,
    stepQty,
    add,
  };
}

export type OptionSelection = ReturnType<typeof useOptionSelection>;
