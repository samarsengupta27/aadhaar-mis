export default function UsersPage() {
  return (
    <div>
      <h1 style={{ color: "#7B1E28", marginBottom: "8px" }}>
        Users Master
      </h1>

      <p style={{ color: "#666", marginBottom: "20px" }}>
        Manage CO, RO, DO and Operator Users.
      </p>

      <button className="btn">
        + Add User
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
            <th style={{ padding: "10px" }}>Employee ID</th>
            <th style={{ padding: "10px" }}>Employee Name</th>
            <th style={{ padding: "10px" }}>Designation</th>
            <th style={{ padding: "10px" }}>Role</th>
            <th style={{ padding: "10px" }}>Division</th>
            <th style={{ padding: "10px" }}>Centre</th>
            <th style={{ padding: "10px" }}>Status</th>
            <th style={{ padding: "10px" }}>Action</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
              No Users Available
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}