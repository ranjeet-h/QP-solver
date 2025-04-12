class PaymentError(Exception):
    """Raised when payment processing fails"""
    pass

class DatabaseError(Exception):
    """Raised when database operations fail"""
    pass

class NotFoundException(Exception):
    """Raised when requested resource is not found"""
    pass 