import Header from './components/Header'
import Login from './components/Login'
import './App.css'

function App() {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-main">
        <Login />
      </main>
    </div>
  )
}

export default App
