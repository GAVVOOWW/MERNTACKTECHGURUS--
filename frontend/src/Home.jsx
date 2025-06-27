"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import "bootstrap/dist/css/bootstrap.min.css"
import { useNavigate, Link } from "react-router-dom"
import {
  Container,
  Row,
  Col,
  Button,
  Alert,
  Spinner,
  Navbar,
  Nav,
  Modal,
  Card,
  Form,
  ListGroup,
  Badge,
  InputGroup,
  Toast,
  ToastContainer,
} from "react-bootstrap"
import {
  BsTrash,
  BsCart,
  BsShop,
  BsPlus,
  BsDash,
  BsCheck2All,
  BsCheckCircle,
  BsExclamationTriangle,
  BsGift,
  BsTruck,
  BsShield,
  BsCreditCard,
  BsArrowRight,
  BsBoxArrowRight,
  BsListUl,
  BsClipboardCheck,
  BsCartX,
  BsCartPlus,
  BsStarFill,
  BsPercent,
} from "react-icons/bs"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Home = () => {
  const [cartItems, setCartItems] = useState([])
  const [userName, setUserName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [recommendedItems, setRecommendedItems] = useState([])
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastVariant, setToastVariant] = useState("success")
  const [processingCheckout, setProcessingCheckout] = useState(false)

  const navigate = useNavigate()
  const userId = localStorage.getItem("userId")
  const token = localStorage.getItem("token")
  const userRole = localStorage.getItem("role")

  const showNotification = (message, variant = "success") => {
    setToastMessage(message)
    setToastVariant(variant)
    setShowToast(true)
  }

  const fetchCartItems = async () => {
    if (!userId || !token) {
      setError("User not authenticated. Please log in.")
      setLoading(false)
      return
    }
    try {
      const response = await axios.get(`${BACKEND_URL}/api/cart/${userId}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const validItems = response.data.items.filter((entry) => entry.item)
      setCartItems(validItems)

      const initialSelected = {}
      validItems.forEach((entry) => {
        initialSelected[entry.item._id] = true
      })
      setSelected(initialSelected)
    } catch (err) {
      setError(err.response ? err.response.data.message : "Error fetching cart items")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserName = async () => {
    if (!userId || !token) return
    try {
      const response = await axios.get(`${BACKEND_URL}/api/singleusers/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUserName(response.data.UserData.name)
    } catch (err) {
      console.error("Error fetching user name")
    }
  }

  useEffect(() => {
    fetchCartItems()
    fetchUserName()
  }, [])

  const updateItemQuantity = async (itemId, action) => {
    const url = `${BACKEND_URL}/api/cart/${userId}/item/${itemId}/${action}`
    try {
      await axios.put(url, {}, { headers: { Authorization: `Bearer ${token}` } })
      fetchCartItems()
      showNotification(`Quantity ${action === "increase" ? "increased" : "decreased"}`)
    } catch (err) {
      showNotification(`Error updating quantity`, "danger")
    }
  }

  const deleteItem = async (itemId) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/cart/${userId}/item/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchCartItems()
      showNotification("Item removed from cart")
    } catch (err) {
      showNotification("Error removing item from cart", "danger")
    }
  }

  const handleSelectAll = (e) => {
    const isChecked = e.target.checked
    const newSelected = {}
    cartItems.forEach((entry) => {
      newSelected[entry.item._id] = isChecked
    })
    setSelected(newSelected)
  }

  const selectedItems = cartItems.filter((entry) => selected[entry.item._id])
  const selectedTotal = selectedItems.reduce((sum, entry) => {
    // Use the final custom price if it exists, otherwise use the item's default price.
    const price = entry.customizations?.finalPrice || entry.item.price;
    return sum + price * entry.quantity;
  }, 0);
  const overStockedItems = selectedItems.filter((entry) => entry.quantity > entry.item.stock)
  const isAllSelected = cartItems.length > 0 && selectedItems.length === cartItems.length
  const savings = selectedItems.reduce((sum, entry) => sum + (entry.item.originalPrice || 0) - entry.item.price, 0)

  const handleCheckout = () => {
    if (selectedItems.length === 0 || overStockedItems.length > 0) return

    setProcessingCheckout(true)
    setTimeout(() => {
      navigate("/checkout", {
        state: {
          selectedItems: selectedItems.map((entry) => ({
            item: entry.item,
            quantity: entry.quantity,
            // *** IMPORTANT: Add the customizations object here ***
            customizations: entry.customizations || null, // This is the new field we'll use in the backend
          })),
        },
      })
      setProcessingCheckout(false)
    }, 1000)
  }

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!showModal || selectedItems.length === 0) return
      try {
        const selectedIds = selectedItems.map((entry) => entry.item._id)
        const response = await axios.post(`${BACKEND_URL}/api/items/recommend`, { selectedIds })
        setRecommendedItems(response.data.ItemData || [])
      } catch (err) {
        console.error("Error fetching recommendations", err.message)
      }
    }
    fetchRecommendations()
  }, [showModal])

  const quickAddToCart = async (itemId) => {
    try {
      await axios.post(
        `${BACKEND_URL}/api/cart/${userId}/add`,
        { itemId, quantity: 1 },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setShowModal(false)
      fetchCartItems()
      showNotification("Item added to cart!")
    } catch (err) {
      showNotification("Failed to add item", "danger")
    }
  }

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: "4rem", height: "4rem" }} />
          <p className="mt-3 text-muted">Loading your shopping cart...</p>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="shadow-sm">
          <Alert.Heading>
            <BsExclamationTriangle className="me-2" />
            Authentication Error
          </Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={() => navigate("/login")}>
              Go to Login
            </Button>
          </div>
        </Alert>
      </Container>
    )
  }

  return (
    <>
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1050 }}>
        <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide>
          <Toast.Header closeButton={true}>
            <BsCheckCircle className={`me-2 text-${toastVariant}`} />
            <strong className="me-auto">{toastVariant === "success" ? "Success" : "Error"}</strong>
          </Toast.Header>
          <Toast.Body>{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Navigation Bar */}
      <Navbar bg="white" variant="light" expand="lg" className="py-3 border-bottom shadow-sm" sticky="top">
        <Container>
          <Navbar.Brand as={Link} to="/" className="fw-bold fs-3" style={{ color: "#EE4D2D" }}>
            <BsShop className="me-2" />
            Wawa Furniture
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/" className="fw-medium">
                <BsShop className="me-1" />
                Shop
              </Nav.Link>
              <Nav.Link as={Link} to="/cart" active className="fw-medium">
                <BsCart className="me-1" />
                Cart
                {cartItems.length > 0 && (
                  <Badge bg="primary" className="ms-1">
                    {cartItems.length}
                  </Badge>
                )}
              </Nav.Link>
            </Nav>
            <Nav>
              <Nav.Link as={Link} to="/orders" className="fw-medium">
                <BsClipboardCheck className="me-1" />
                My Orders
              </Nav.Link>
              {userRole === "admin" && (
                <Nav.Link as={Link} to="/admin" className="fw-medium">
                  <BsListUl className="me-1" />
                  Admin Panel
                </Nav.Link>
              )}
              <Nav.Link
                onClick={() => {
                  localStorage.clear()
                  navigate("/")
                }}
                className="fw-medium text-danger"
              >
                <BsBoxArrowRight className="me-1" />
                Logout
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="my-5">
        {cartItems.length === 0 ? (
          /* Empty Cart State */
          <div className="text-center">
            <Card className="border-0 shadow-sm" style={{ maxWidth: "600px", margin: "0 auto" }}>
              <Card.Body className="p-5">
                <BsCartX size={80} className="text-muted mb-4" />
                <h2 className="fw-bold mb-3">Your Cart is Empty</h2>
                <p className="text-muted mb-4">
                  Looks like you haven't added anything to your cart yet. Start exploring our amazing furniture
                  collection!
                </p>
                <div className="d-flex justify-content-center gap-3">
                  <Button variant="primary" size="lg" as={Link} to="/">
                    <BsShop className="me-2" />
                    Start Shopping
                  </Button>
                  <Button variant="outline-secondary" size="lg" as={Link} to="/recommendation">
                    <BsGift className="me-2" />
                    Get Recommendations
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        ) : (
          <>
            {/* Cart Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="fw-bold mb-1">
                  <BsCart className="me-2 text-primary" />
                  Shopping Cart
                </h2>
                {userName && <p className="text-muted mb-0">Welcome back, {userName}!</p>}
              </div>
              <div className="d-flex align-items-center gap-3">
                <Form.Check
                  type="checkbox"
                  id="select-all"
                  label={
                    <span className="fw-medium">
                      <BsCheck2All className="me-1" />
                      Select All ({cartItems.length})
                    </span>
                  }
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="user-select-none"
                />
              </div>
            </div>

            <Row>
              {/* Cart Items */}
              <Col lg={8} className="mb-4">
                <div className="d-flex flex-column gap-3">
                  {cartItems.map((entry) => {
                    const hasStockIssue = selected[entry.item._id] && entry.quantity > entry.item.stock
                    const isSelected = selected[entry.item._id]

                    return (
                      <Card
                        key={entry.item._id}
                        className={`border-0 shadow-sm ${isSelected ? "border-primary" : ""}`}
                        style={{ borderLeft: isSelected ? "4px solid #0d6efd" : "none" }}
                      >
                        <Card.Body className="p-4">
                          <Row className="align-items-center">
                            {/* Checkbox */}
                            <Col xs="auto">
                              <Form.Check
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) =>
                                  setSelected((prev) => ({ ...prev, [entry.item._id]: e.target.checked }))
                                }
                                style={{ transform: "scale(1.2)" }}
                              />
                            </Col>

                            {/* Product Image */}
                            <Col xs="auto">
                              <div
                                className="position-relative"
                                style={{ width: "100px", height: "100px", overflow: "hidden", borderRadius: "8px" }}
                              >
                                <img
                                  src={entry.item.imageUrl?.[0] || "https://via.placeholder.com/150"}
                                  alt={entry.item.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                                {entry.item.is_bestseller && (
                                  <Badge
                                    bg="warning"
                                    text="dark"
                                    className="position-absolute top-0 start-0 m-1"
                                    style={{ fontSize: "0.7rem" }}
                                  >
                                    <BsStarFill className="me-1" />
                                    Best
                                  </Badge>
                                )}
                              </div>
                            </Col>

                            {/* Product Details */}
                            <Col>
                              <div>
                                <h5 className="mb-1 fw-bold">{entry.item.name}</h5>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <span className="text-muted small">Unit Price:</span>
                                  <span className="fw-bold text-primary">₱{entry.item.price.toFixed(2)}</span>
                                  {entry.item.originalPrice && entry.item.originalPrice > entry.item.price && (
                                    <span className="text-muted text-decoration-line-through small">
                                      ₱{entry.item.originalPrice.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                  <Badge bg="light" text="dark" className="small">
                                    Stock: {entry.item.stock}
                                  </Badge>
                                  {entry.item.category && (
                                    <Badge bg="secondary" className="small">
                                      {typeof entry.item.category === "object"
                                        ? entry.item.category.name
                                        : entry.item.category}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Col>

                            {/* Quantity Controls */}
                            <Col md={3}>
                              <div className="d-flex flex-column align-items-center">
                                <InputGroup style={{ maxWidth: "140px" }}>
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => updateItemQuantity(entry.item._id, "decrease")}
                                    disabled={entry.quantity <= 1}
                                  >
                                    <BsDash />
                                  </Button>
                                  <Form.Control
                                    type="text"
                                    value={entry.quantity}
                                    readOnly
                                    className="text-center fw-bold"
                                    size="sm"
                                  />
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => updateItemQuantity(entry.item._id, "increase")}
                                    disabled={entry.quantity >= entry.item.stock}
                                  >
                                    <BsPlus />
                                  </Button>
                                </InputGroup>
                                <small className="text-muted mt-1">Max: {entry.item.stock}</small>
                              </div>
                            </Col>

                            {/* Subtotal */}
                            <Col md={2} className="text-end">
                              <div className="fw-bold fs-5 text-primary">
                                ₱{(entry.item.price * entry.quantity).toFixed(2)}
                              </div>
                              {entry.item.originalPrice && entry.item.originalPrice > entry.item.price && (
                                <div className="small text-success">
                                  <BsPercent className="me-1" />
                                  Save ₱{((entry.item.originalPrice - entry.item.price) * entry.quantity).toFixed(2)}
                                </div>
                              )}
                            </Col>

                            {/* Delete Button */}
                            <Col xs="auto">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => deleteItem(entry.item._id)}
                                className="rounded-circle"
                                style={{ width: "40px", height: "40px" }}
                              >
                                <BsTrash />
                              </Button>
                            </Col>
                          </Row>

                          {/* Stock Issue Alert */}
                          {hasStockIssue && (
                            <Alert variant="danger" className="mt-3 mb-0 py-2">
                              <BsExclamationTriangle className="me-2" />
                              <strong>Stock Issue:</strong> Only {entry.item.stock} units available. Please adjust
                              quantity.
                            </Alert>
                          )}
                        </Card.Body>
                      </Card>
                    )
                  })}
                </div>
              </Col>

              {/* Order Summary */}
              <Col lg={4}>
                <div className="sticky-top" style={{ top: "7rem" }}>
                  <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white border-bottom">
                      <h5 className="mb-0 fw-bold">
                        <BsClipboardCheck className="me-2 text-primary" />
                        Order Summary
                      </h5>
                    </Card.Header>
                    <Card.Body className="p-4">
                      <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-3">
                          <span>Subtotal ({selectedItems.length} items)</span>
                          <span className="fw-bold">₱{selectedTotal.toFixed(2)}</span>
                        </ListGroup.Item>
                        {savings > 0 && (
                          <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-2">
                            <span className="text-success">
                              <BsPercent className="me-1" />
                              You Save
                            </span>
                            <span className="text-success fw-bold">-₱{savings.toFixed(2)}</span>
                          </ListGroup.Item>
                        )}

                        <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-3 border-top">
                          <span className="fw-bold fs-5">Total</span>
                          <span className="fw-bold fs-4 text-primary">₱{selectedTotal.toFixed(2)}</span>
                        </ListGroup.Item>
                      </ListGroup>

                      <div className="d-grid mt-4">
                        <Button
                          variant="primary"
                          size="lg"
                          disabled={selectedItems.length === 0 || overStockedItems.length > 0 || processingCheckout}
                          onClick={() => setShowModal(true)}
                          className="fw-bold py-3"
                        >
                          {processingCheckout ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <BsArrowRight className="me-2" />
                              Proceed to Checkout
                            </>
                          )}
                        </Button>
                      </div>

                      {overStockedItems.length > 0 && (
                        <Alert variant="warning" className="mt-3 mb-0 py-2">
                          <BsExclamationTriangle className="me-2" />
                          <small>Please fix stock issues before checkout.</small>
                        </Alert>
                      )}

                      {/* Trust Indicators */}
                      <div className="mt-4 pt-3 border-top">
                        <Row className="text-center">
                          <Col>
                            <BsShield className="text-success mb-1" size={20} />
                            <div className="small text-muted">Secure</div>
                          </Col>
                          <Col>
                            <BsTruck className="text-primary mb-1" size={20} />
                            <div className="small text-muted">Reliable Shipment</div>
                          </Col>
                          <Col>
                            <BsCreditCard className="text-info mb-1" size={20} />
                            <div className="small text-muted">Easy Payment!</div>
                          </Col>
                        </Row>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              </Col>
            </Row>
          </>
        )}
      </Container>

      {/* Checkout Confirmation Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold">
            <BsCheckCircle className="me-2 text-success" />
            Confirm Your Order
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Order Details ({selectedItems.length} items):</h6>
            <ListGroup variant="flush">
              {selectedItems.map((entry) => (
                <ListGroup.Item key={entry.item._id} className="d-flex justify-content-between align-items-center px-0">
                  <div className="d-flex align-items-center">
                    <img
                      src={entry.item.imageUrl?.[0] || "https://via.placeholder.com/50"}
                      alt={entry.item.name}
                      style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" }}
                      className="me-3"
                    />
                    <div>
                      <div className="fw-medium">{entry.item.name}</div>
                      <small className="text-muted">Qty: {entry.quantity}</small>
                    </div>
                  </div>
                  <span className="fw-bold">₱{(entry.quantity * entry.item.price).toFixed(2)}</span>
                </ListGroup.Item>
              ))}
              <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 border-top">
                <span className="fw-bold fs-5">Total Amount</span>
                <span className="fw-bold fs-4 text-primary">₱{selectedTotal.toFixed(2)}</span>
              </ListGroup.Item>
            </ListGroup>
          </div>

          {/* Recommendations */}
          {recommendedItems.length > 0 && (
            <div className="border-top pt-4">
              <h6 className="fw-bold mb-3">
                <BsGift className="me-2 text-warning" />
                You might also like:
              </h6>
              <Row xs={2} md={3} className="g-3">
                {recommendedItems.slice(0, 6).map((rec) => (
                  <Col key={rec._id}>
                    <Card className="h-100 border-0 shadow-sm">
                      <div style={{ height: "120px", overflow: "hidden" }}>
                        <Card.Img
                          variant="top"
                          src={rec.imageUrl?.[0] || "https://via.placeholder.com/100"}
                          style={{ height: "100%", objectFit: "cover" }}
                        />
                      </div>
                      <Card.Body className="p-3">
                        <div
                          className="small fw-medium mb-2"
                          title={rec.name}
                          style={{ height: "32px", overflow: "hidden" }}
                        >
                          {rec.name}
                        </div>
                        <div className="small text-primary fw-bold mb-2">₱{rec.price.toFixed(2)}</div>
                        <div className="d-grid">
                          <Button variant="outline-primary" size="sm" onClick={() => quickAddToCart(rec._id)}>
                            <BsCartPlus className="me-1" />
                            Quick Add
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
            Continue Shopping
          </Button>
          <Button variant="primary" onClick={handleCheckout} className="fw-bold">
            <BsCheckCircle className="me-2" />
            Confirm & Checkout
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default Home
