import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const ButtonBar = ({ buttons }) => {
  return (
    <div className="flex gap-2 justify-center text-xs">
      {buttons.map((btn) => (
        <div key={btn.key || btn.label} className={btn.wrapperClassName || ""}>
          <button
            onClick={btn.onClick}
            disabled={btn.disabled}
            className={
              btn.className ||
              `bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 ${
                btn.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-700"
              }`
            }
          >
            {btn.icon && <FontAwesomeIcon icon={btn.icon} />}
            {btn.label}
            {btn.trailingIcon && (
              <FontAwesomeIcon
                icon={btn.trailingIcon}
                className="text-[10px]"
              />
            )}
          </button>
        </div>
      ))}
    </div>
  );
};

export default ButtonBar;
