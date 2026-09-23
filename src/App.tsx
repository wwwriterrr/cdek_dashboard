import { describeError } from "./api/baseApi";
import { useVerifySessionQuery } from "./api/authApi";
import { AuthGate } from "./features/auth/AuthGate";
import { OrdersPage } from "./features/orders/OrdersPage";
import "./styles/app.css";

export function App() {
  const { data: session, isLoading, isError, error, refetch } = useVerifySessionQuery();

  return (
    <div className="alterlit-dashboard">
      <div className="shell">
        {isLoading && (
          <div className="screen">
            <h2 className="screen__title">Проверяем доступ</h2>
            <p className="screen__text">Секунду — убеждаемся, что сессия ещё жива.</p>
          </div>
        )}

        {isError &&
          (() => {
            const { message, access } = describeError(error);
            return <AuthGate access={access} message={message} onRetry={() => void refetch()} />;
          })()}

        {/* Права проверяем до таблицы: бэк отдаёт is_staff прямо в сессии,
            и показывать заказы тому, кому всё равно откажут, незачем. */}
        {session && !session.isStaff && (
          <AuthGate
            access="forbidden"
            message="Нет прав администратора."
            onRetry={() => void refetch()}
          />
        )}

        {session?.isStaff && <OrdersPage session={session} />}
      </div>
    </div>
  );
}
