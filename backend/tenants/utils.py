import contextvars

# Context variable to store the current tenant_id during request lifecycle
_tenant_id = contextvars.ContextVar('tenant_id', default=None)

def get_current_tenant_id():
    """
    Returns the active tenant_id for the current thread/async context.
    """
    return _tenant_id.get()

def set_current_tenant_id(tenant_id):
    """
    Sets the active tenant_id and returns a token to reset it.
    """
    return _tenant_id.set(tenant_id)

def clear_current_tenant_id(token=None):
    """
    Clears the active tenant_id or resets it to the value before the token was set.
    """
    if token is not None:
        _tenant_id.reset(token)
    else:
        _tenant_id.set(None)
