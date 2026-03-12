"""Pagination schemas and utilities for list endpoints."""
from typing import Generic, TypeVar
from pydantic import BaseModel, Field
from math import ceil


T = TypeVar("T")


class PaginationParams(BaseModel):
    """Query parameters for pagination."""

    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(
        default=50,
        ge=1,
        le=200,
        description="Number of items per page (max 200)"
    )

    @property
    def offset(self) -> int:
        """Calculate offset for database query."""
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        """Get limit for database query."""
        return self.page_size


class PaginationMeta(BaseModel):
    """Pagination metadata."""

    page: int = Field(description="Current page number")
    page_size: int = Field(description="Items per page")
    total_items: int = Field(description="Total number of items")
    total_pages: int = Field(description="Total number of pages")
    has_next: bool = Field(description="Whether there is a next page")
    has_prev: bool = Field(description="Whether there is a previous page")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""

    items: list[T] = Field(description="List of items for current page")
    pagination: PaginationMeta = Field(description="Pagination metadata")

    @classmethod
    def create(
        cls,
        items: list[T],
        total: int,
        page: int,
        page_size: int
    ) -> "PaginatedResponse[T]":
        """Create a paginated response from query results.

        Args:
            items: List of items for the current page
            total: Total count of items across all pages
            page: Current page number (1-indexed)
            page_size: Number of items per page

        Returns:
            PaginatedResponse with items and pagination metadata
        """
        total_pages = ceil(total / page_size) if page_size > 0 else 0

        pagination = PaginationMeta(
            page=page,
            page_size=page_size,
            total_items=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )

        return cls(items=items, pagination=pagination)
