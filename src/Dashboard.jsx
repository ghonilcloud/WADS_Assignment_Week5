import { useState, useEffect } from "react";
import { Trash2, CheckCircle, Circle, Edit } from "lucide-react";
import { auth, db } from "./firebase"; // Ensure firebase auth and db are properly imported
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import { collection, query, addDoc, deleteDoc, where, getDocs, setDoc, doc, getDoc } from "firebase/firestore"; // Firestore functions
import "./Dashboard.css";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [filter, setFilter] = useState("all");
  const [profilePicture, setProfilePicture] = useState(null); // State to store profile picture file
  const [profilePicUrl, setProfilePicUrl] = useState(""); // State to store base64 string of the profile picture
  const [errorMessage, setErrorMessage] = useState(""); // State to store error message

  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/"); // Redirect to login if not authenticated
    }
  }, [user, loading, navigate]);

  // Fetch tasks from Firestore when the component mounts
  useEffect(() => {
    if (user) {
      const fetchTasks = async () => {
        const tasksRef = collection(db, "tasks");
        const q = query(tasksRef, where("uid", "==", user.uid)); // Query tasks for the current user
        const querySnapshot = await getDocs(q);
        const tasksData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id, // Include the Firestore document ID as part of the task
        }));
        setTasks(tasksData);
      };
      fetchTasks();

      // Fetch the profile picture (base64 string) from Firestore
      const fetchProfilePicUrl = async () => {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setProfilePicUrl(userDoc.data().profilePicUrl || "");
        }
      };
      fetchProfilePicUrl();
    }
  }, [user]);

  // Convert image to base64 string and save to Firestore
  const uploadProfilePicture = async () => {
    if (!profilePicture) return; // No picture selected
    if (profilePicture.size > 1024 * 1024) {
      setErrorMessage("Image size should not exceed 1MB.");
      return;
    }
    setErrorMessage(""); // Clear error message

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result.split(",")[1]; // Extract base64 string
      setProfilePicUrl(base64String); // Store it in local state

      // Save the base64 string to Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { profilePicUrl: base64String }, { merge: true });
    };
    reader.readAsDataURL(profilePicture); // Convert file to base64
  };

  const handleProfilePictureChange = (e) => {
    setProfilePicture(e.target.files[0]); // Set the file selected by the user
  };

  // Save task to Firestore
  const saveTask = async (task) => {
    const taskRef = doc(collection(db, "tasks")); // Create a new document reference
    await setDoc(taskRef, task); // Save the task in Firestore
  };

  const addTask = async () => {
    if (newTask.trim() !== "") {
      const newTaskData = { text: newTask, completed: false, uid: user.uid };
  
      // Add task to Firestore
      const docRef = await addDoc(collection(db, "tasks"), newTaskData);
  
      // Add the task to local state with its generated Firestore ID
      const addedTask = { ...newTaskData, id: docRef.id };
  
      setTasks([...tasks, addedTask]);
      setNewTask("");
    }
  };

  const editTask = (index) => {
    setNewTask(tasks[index].text);
    setEditingIndex(index);
  };

  const updateTask = async () => {
    if (newTask.trim() !== "" && editingIndex !== null) {
      const updatedTask = { ...tasks[editingIndex], text: newTask };
      const taskRef = doc(db, "tasks", tasks[editingIndex].id); // Use the task's id here
      await setDoc(taskRef, updatedTask); // Update the task in Firestore
      const updatedTasks = tasks.map((task, index) =>
        index === editingIndex ? updatedTask : task
      );
      setTasks(updatedTasks);
      setNewTask("");
      setEditingIndex(null);
    }
  };

  const removeTask = async (index) => {
    const taskRef = doc(db, "tasks", tasks[index].id); // Use the task's id here
    await deleteDoc(taskRef); // Delete the task from Firestore
    setTasks(tasks.filter((_, i) => i !== index)); // Remove task from local state
  };

  const toggleTaskCompletion = async (index) => {
    const updatedTask = { ...tasks[index], completed: !tasks[index].completed };
    const taskRef = doc(db, "tasks", tasks[index].id); // Use the task's id here
    await setDoc(taskRef, updatedTask); // Update the task's completion status in Firestore
    setTasks(
      tasks.map((task, i) =>
        i === index ? updatedTask : task
      )
    );
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "completed") return task.completed;
    if (filter === "active") return !task.completed;
    return true;
  });

  return (
    <>
      {/* Account Information Section */}
      <div className="max-w-md mx-auto p-4 space-y-4 mb-6">
        <div className="p-4 bg-gray-100 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold">Account Information</h2>
          <div className="mb-4">
            {/* Profile Picture */}
            {profilePicUrl ? (
              <img
                src={`data:image/jpeg;base64,${profilePicUrl}`}
                alt="Profile"
                className="profile-img mx-auto"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-300 mx-auto"></div>
            )}
            <input
              type="file"
              onChange={handleProfilePictureChange}
              accept="image/*"
              className="mt-2"
            />
            <button
              onClick={uploadProfilePicture}
              className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
            >
              Upload Picture (1 MB)
            </button>
            {errorMessage && (
              <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
            )}
          </div>
          <p>Email: {user?.email}</p>
          <p>UID: {user?.uid}</p>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded mt-2"
            onClick={() => auth.signOut()}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Task List Section */}
      <div className="max-w-md mx-auto p-4 space-y-4 mb-6"> {/* Vertical margin */}
        <div className="mb-4">
          <input
            className="border p-2 w-full rounded"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Enter a task..."
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
            onClick={editingIndex !== null ? updateTask : addTask}
          >
            {editingIndex !== null ? "Update" : "Add"}
          </button>
        </div>

        {/* Filter Section */}
        <div className="mb-4">
          <label className="mr-2">Filter: </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {filteredTasks.map((task, index) => (
            <div key={index} className="flex justify-between items-center p-2 border rounded">
              <button onClick={() => toggleTaskCompletion(index)}>
                {task.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <span className={task.completed ? "line-through text-gray-500" : ""}>
                {task.text}
              </span>
              <div className="flex gap-2">
                <button className="text-yellow-500" onClick={() => editTask(index)}>
                  <Edit className="w-4 h-4" />
                </button>
                <button className="text-red-500" onClick={() => removeTask(index)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Remaining Tasks */}
        <div className="mt-4">
          <span className="font-bold">
            {tasks.filter(task => !task.completed).length} tasks remaining
          </span>
        </div>
      </div>
    </>
  );
}