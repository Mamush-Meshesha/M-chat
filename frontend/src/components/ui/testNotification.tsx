import { FC } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { RootState } from "../../store";
// import { clearAuth } from "../../slice/authSlice";

interface TestNotificationProps {}

const TestNotification: FC<TestNotificationProps> = () => {
  // const [testResults, setTestResults] = useState<string[]>([]);
  // const dispatch = useDispatch();
  // const authUser = useSelector((state: RootState) => state.auth.user);
  // const isAuthenticated = useSelector(
  //   (state: RootState) => state.auth.isAuthenticated
  // );

  // const addResult = (result: string) => {
  //   setTestResults((prev) => [
  //     ...prev,
  //     `${new Date().toLocaleTimeString()}: ${result}`,
  //   ]);
  // };

  // const testAuthState = () => {
  //   addResult("Testing authentication state...");
  //   addResult(`Authenticated: ${isAuthenticated}`);
  //   addResult(`User: ${authUser ? JSON.stringify(authUser) : "null"}`);

  //   // Check localStorage
  //   const storedUser = localStorage.getItem("authUser");
  //   addResult(
  //     `Stored user in localStorage: ${storedUser ? "exists" : "missing"}`
  //   );

  //   if (storedUser) {
  //     try {
  //       const parsed = JSON.parse(storedUser);
  //       addResult(`Parsed stored user: ${JSON.stringify(parsed)}`);

  //       // Check if data is valid
  //       if (parsed._id && parsed.name && parsed.email) {
  //         addResult("✅ Stored user data is valid");

  //         // Check token
  //         if (parsed.token) {
  //           addResult(`✅ Token exists: ${parsed.token.substring(0, 20)}...`);
  //         } else {
  //           addResult("⚠️ No token found in stored user data");
  //         }
  //       } else {
  //         addResult("❌ Stored user data is incomplete or corrupted");
  //       }
  //     } catch (error) {
  //       addResult(`Failed to parse stored user: ${error}`);
  //     }
  //   }
  // };

  // const clearAuthData = () => {
  //   addResult("🧹 Clearing all authentication data...");
  //   dispatch(clearAuth());
  //   addResult("✅ Auth data cleared - refresh page to see changes");
  // };

  // const clearResults = () => {
  //   setTestResults([]);
  // };

  return (
    // <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-md z-50">
    //     <h3 className="text-lg font-semibold mb-4">Authentication Test</h3>

    //     <div className="space-y-2 mb-4">
    //       <button
    //         onClick={testAuthState}
    //         className="w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
    //       >
    //         Test Auth State
    //       </button>

    //       <button
    //         onClick={clearAuthData}
    //         className="w-full bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
    //       >
    //         Clear All Auth Data
    //       </button>

    //       <button
    //         onClick={clearResults}
    //         className="w-full bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600"
    //       >
    //         Clear Results
    //       </button>
    //     </div>

    //     <div className="max-h-64 overflow-y-auto">
    //       <h4 className="font-medium mb-2">Test Results:</h4>
    //       {testResults.length === 0 ? (
    //         <p className="text-gray-500 text-sm">No tests run yet</p>
    //       ) : (
    //         <div className="space-y-1">
    //           {testResults.map((result, index) => (
    //             <div key={index} className="text-xs bg-gray-100 p-2 rounded">
    //               {result}
    //             </div>
    //           ))}
    //         </div>
    //       )}
    //     </div>
    // </div>
    <></>
  );
};

export default TestNotification;
