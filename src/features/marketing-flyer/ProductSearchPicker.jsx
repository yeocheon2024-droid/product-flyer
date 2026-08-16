import { useEffect, useId, useMemo, useRef, useState } from "react";

import { searchCatalogProducts } from "./productSearch.js";

function productCode(product) {
  return String(product?.code ?? product?.id ?? "");
}

function productName(product) {
  return product?.display_name || product?.name || "상품명 미등록";
}

function productMeta(product) {
  const price = Number(product?.sell);
  return [
    product?.spec || "규격 미등록",
    product?.major_name,
    product?.minor_name,
    productCode(product),
    Number.isFinite(price) && price > 0 ? `${price.toLocaleString("ko-KR")}원` : null,
  ].filter(Boolean).join(" · ");
}

export function ProductSearchPicker({ catalog, value, selectedCodes = [], slotNumber, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listboxId = useId();
  const selected = useMemo(
    () => catalog.find((product) => productCode(product) === String(value)),
    [catalog, value],
  );
  const selectableCatalog = useMemo(() => {
    const usedByOtherSlots = new Set(
      selectedCodes.map(String).filter((code) => code && code !== String(value)),
    );
    return catalog.filter((product) => (
      !product?.sold_out
      && !product?.hidden
      && !usedByOtherSlots.has(productCode(product))
    ));
  }, [catalog, selectedCodes, value]);
  const searchResult = useMemo(
    () => searchCatalogProducts(selectableCatalog, query),
    [query, selectableCatalog],
  );
  const options = searchResult.items;
  const activeOptionId = open && options[activeIndex]
    ? `${listboxId}-option-${activeIndex}`
    : undefined;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!activeOptionId) return;
    document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [activeOptionId]);

  const chooseProduct = (product) => {
    onSelect(productCode(product));
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    // Enter while a Korean syllable is still being composed must not select a product.
    if (event.nativeEvent?.isComposing || event.isComposing || event.keyCode === 229) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((current) => Math.min(current + 1, Math.max(options.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(Math.max(options.length - 1, 0));
      return;
    }
    if (event.key === "Enter" && open && options[activeIndex]) {
      event.preventDefault();
      chooseProduct(options[activeIndex]);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div
      className="mkt-product-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="mkt-product-picker__selected">
        <span>현재 선택</span>
        <strong>{selected ? productName(selected) : "선택 상품을 찾을 수 없습니다"}</strong>
        {selected && <small>{productMeta(selected)}</small>}
      </div>

      <div className="mkt-product-picker__input-wrap">
        <span className="mkt-product-picker__search-icon" aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          role="combobox"
          aria-label={`${slotNumber}번 특가 상품 검색`}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          placeholder="상품명·규격·코드·분류 검색"
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            className="mkt-product-picker__clear"
            aria-label="검색어 지우기"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery("");
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="mkt-product-picker__menu">
          <div className="mkt-product-picker__summary" aria-live="polite">
            {query
              ? `${searchResult.total.toLocaleString("ko-KR")}개 검색됨`
              : `선택 가능한 ${searchResult.total.toLocaleString("ko-KR")}개 중 처음 ${options.length}개`}
            {searchResult.total > options.length && " · 검색어를 더 입력해 주세요"}
          </div>
          <ul id={listboxId} role="listbox" aria-label={`${slotNumber}번 특가 상품 검색 결과`}>
            {options.map((item, optionIndex) => {
              const code = productCode(item);
              const isActive = optionIndex === activeIndex;
              const isSelected = code === String(value);
              return (
                <li
                  id={`${listboxId}-option-${optionIndex}`}
                  key={code}
                  role="option"
                  aria-selected={isSelected}
                  className={`${isActive ? "is-active" : ""}${isSelected ? " is-selected" : ""}`}
                  onMouseEnter={() => setActiveIndex(optionIndex)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseProduct(item)}
                >
                  <strong>{productName(item)}</strong>
                  <small>{productMeta(item)}</small>
                  {isSelected && <span>선택됨</span>}
                </li>
              );
            })}
          </ul>
          {options.length === 0 && (
            <p className="mkt-product-picker__empty">일치하는 상품이 없습니다. 이름이나 코드 일부를 다시 입력해 주세요.</p>
          )}
        </div>
      )}
    </div>
  );
}
