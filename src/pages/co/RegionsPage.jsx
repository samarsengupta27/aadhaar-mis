export default function RegionsPage() {
  return (
    <div>
      <h1 style={{ color: "#7B1E28", marginBottom: "8px" }}>
        Regions Master
      </h1>

      <p style={{ color: "#666", marginBottom: "20px" }}>
        Manage Regions under Assam Circle.
      </p>

      <button className="btn">
        + Add Region
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
            <th style={{ padding: "10px" }}>Region Code</th>
            <th style={{ padding: "10px" }}>Region Name</th>
            <th style={{ padding: "10px" }}>Status</th>
            <th style={{ padding: "10px" }}>Action</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={{ padding: "10px" }}>HQ</td>
            <td>HQ Region</td>
            <td>Active</td>
            <td>Edit</td>
          </tr>

          <tr>
            <td style={{ padding: "10px" }}>DBR</td>
            <td>Dibrugarh Region</td>
            <td>Active</td>
            <td>Edit</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}