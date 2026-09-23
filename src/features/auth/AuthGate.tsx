import type { AccessProblem } from "../../api/baseApi";

/** Куда вести на вход. В проде домен тот же, поэтому путь относительный. */
const LOGIN_URL = `/login/?next=${encodeURIComponent(window.location.pathname)}`;

interface Props {
  /** null — проблема не в доступе, а в сети или на сервере. */
  access: AccessProblem | null;
  /** Сообщение от бэка или наше объяснение. */
  message: string;
  onRetry: () => void;
}

export function AuthGate({ access, message, onRetry }: Props) {
  if (access === null) {
    return (
      <div className="screen">
        <h2 className="screen__title">Не удалось проверить сессию</h2>
        <p className="screen__text">{message}</p>
        <div className="screen__actions">
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  if (access === "forbidden") {
    return (
      <div className="screen">
        <h2 className="screen__title">Нет прав администратора</h2>
        <p className="screen__text">
          Вы вошли, но у этой учётной записи нет доступа к предзаказам. Попросите
          выдать права сотрудника или войдите под другой учётной записью.
        </p>
        <div className="screen__actions">
          <a className="btn" href={LOGIN_URL}>
            Сменить учётную запись
          </a>
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            Проверить снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2 className="screen__title">Нужна авторизация</h2>
      <p className="screen__text">
        Панель предзаказов доступна только сотрудникам издательства. Войдите под
        учётной записью администратора и вернитесь на эту страницу.
      </p>
      <div className="screen__actions">
        <a className="btn btn--primary" href={LOGIN_URL}>
          Войти
        </a>
        <button type="button" className="btn" onClick={onRetry}>
          Я уже вошёл
        </button>
      </div>
    </div>
  );
}
