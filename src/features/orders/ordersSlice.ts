import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_LIMIT, LIMIT_STEP } from "../../api/ordersApi";
import type { OrderStatus, PayStatus, SortDirection, SortField } from "../../types/domain";

export interface OrdersUiState {
  search: string;
  /** null — показываем все статусы. */
  statusFilter: OrderStatus | "unknown" | null;
  payFilter: PayStatus | null;
  sortField: SortField;
  sortDirection: SortDirection;
  /** Сколько заказов запрашивать у бэка. Растёт по кнопке «Показать ещё». */
  limit: number;
}

const initialState: OrdersUiState = {
  search: "",
  statusFilter: null,
  payFilter: null,
  sortField: "dt",
  sortDirection: "desc",
  limit: DEFAULT_LIMIT,
};

const ordersSlice = createSlice({
  name: "ordersUi",
  initialState,
  reducers: {
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    statusFilterChanged(state, action: PayloadAction<OrdersUiState["statusFilter"]>) {
      state.statusFilter = action.payload;
    },
    payFilterChanged(state, action: PayloadAction<PayStatus | null>) {
      state.payFilter = action.payload;
    },
    /** Повторный клик по той же колонке переключает направление. */
    sortRequested(state, action: PayloadAction<SortField>) {
      if (state.sortField === action.payload) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortField = action.payload;
        state.sortDirection = action.payload === "id" ? "asc" : "desc";
      }
    },
    moreRequested(state) {
      state.limit += LIMIT_STEP;
    },
    filtersReset(state) {
      state.search = "";
      state.statusFilter = null;
      state.payFilter = null;
    },
  },
});

export const {
  searchChanged,
  statusFilterChanged,
  payFilterChanged,
  sortRequested,
  moreRequested,
  filtersReset,
} = ordersSlice.actions;

export default ordersSlice.reducer;
