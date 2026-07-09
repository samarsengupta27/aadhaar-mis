export default function CentresMasterPage() {
  return (
    <div>
      <h1 style={{ color: "#7B1E28", marginBottom: "8px" }}>
        Centres Master
      </h1>

      <p style={{ color: "#666", marginBottom: "20px" }}>
        Manage Aadhaar Centres under Assam Circle.
      </p>

      <button className="btn">
        + Add Centre
      </button>

      <table
        style={{
          width: "100%",
          marginTop: "20px",
          borderCollapse: "collapse",
          background: "#fff",
        }}
      >
        <thead style={{ background: "#7B1E28", color: "#fff" }}>
          <tr>
            <th style={{ padding: "10px" }}>Centre ID</th>
            <th style={{ padding: "10px" }}>Centre Name</th>
            <th style={{ padding: "10px" }}>Office Type</th>
            <th style={{ padding: "10px" }}>Division</th>
            <th style={{ padding: "10px" }}>Region</th>
            <th style={{ padding: "10px" }}>Status</th>
            <th style={{ padding: "10px" }}>Action</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
              No Centres Available
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}