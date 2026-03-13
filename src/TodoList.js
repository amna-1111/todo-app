import { useQuery, useMutation, gql } from "@apollo/client";
import { useState } from "react";

const GET_TODOS = gql`
  query GetTodos {
    getTodos {
      id
      name
      description
      completed
    }
  }
`;

const ADD_TODO = gql`
  mutation AddTodo($name: String!, $description: String) {
    addTodo(name: $name, description: $description) {
      id
      name
      description
      completed
    }
  }
`;

const TOGGLE_TODO = gql`
  mutation ToggleTodo($id: ID!) {
    toggleTodo(id: $id) {
      id
      completed
    }
  }
`;

function TodoList() {
  const { loading, error, data } = useQuery(GET_TODOS);
  const [addTodo] = useMutation(ADD_TODO, {
    refetchQueries: [{ query: GET_TODOS }]
  });
  const [toggleTodo] = useMutation(TOGGLE_TODO, {
    refetchQueries: [{ query: GET_TODOS }]
  });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    if (!name) return;
    addTodo({ variables: { name, description } });
    setName("");
    setDescription("");
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h2>Todos</h2>
      <input
        placeholder="Todo name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button onClick={handleAdd}>Add Todo</button>
      <ul>
        {data.getTodos.map((todo) => (
          <li
            key={todo.id}
            style={{ textDecoration: todo.completed ? "line-through" : "none" }}
            onClick={() => toggleTodo({ variables: { id: todo.id } })}
          >
            <strong>{todo.name}</strong> — {todo.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoList;
