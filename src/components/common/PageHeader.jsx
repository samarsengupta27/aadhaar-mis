export default function PageHeader({
  title,
  subtitle,
  buttonText,
  onButtonClick,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            color: "#7B1E28",
            fontSize: "28px",
            fontWeight: "700",
          }}
        >
          {title}
        </h1>

        <p
          style={{
            marginTop: "6px",
            color: "#666",
            fontSize: "14px",
          }}
        >
          {subtitle}
        </p>
      </div>

      {buttonText && (
        <button
          className="btn"
          onClick={onButtonClick}
          style={{
            background: "#7B1E28",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}