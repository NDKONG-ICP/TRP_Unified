/**
 * Logistics Service - Backend Integration with logistics Canister
 * Handles loads and shipment tracking
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';

// ============ TYPES ============

export interface Load {
  id: string;
  shipper: string;
  origin: string;
  destination: string;
  pickupDate: string;
  deliveryDate: string;
  weight: string;
  equipmentType: 'dry_van' | 'refrigerated' | 'flatbed' | 'tanker' | 'container' | 'other';
  rate: bigint;
  distance: string;
  description: string;
  status: 'available' | 'booked' | 'in_transit' | 'delivered';
  assignedDriver?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Shipment {
  id: string;
  loadId: string;
  status: 'picked_up' | 'in_transit' | 'delivered' | 'delayed';
  origin: string;
  destination: string;
  currentLocation?: string;
  estimatedDelivery: string;
  updates: ShipmentUpdate[];
}

export interface ShipmentUpdate {
  timestamp: number;
  location: string;
  status: string;
  message: string;
}

// Backend types
interface BackendLoad {
  id: string;
  shipper: { toText: () => string } | string;
  origin: string;
  destination: string;
  pickup_date: string;
  delivery_date: string;
  weight: string;
  load_type: { DryVan?: null } | { Refrigerated?: null } | { Flatbed?: null } | { Tanker?: null } | { Container?: null } | { Other?: string };
  rate: bigint;
  distance: string;
  description: string;
  status: { Posted?: null } | { Bidding?: null } | { Assigned?: null } | { PickedUp?: null } | { InTransit?: null } | { Delivered?: null } | { Completed?: null } | { Cancelled?: null };
  assigned_driver?: [{ toText: () => string }] | [];
  created_at: bigint;
  updated_at: bigint;
}

// Logistics Canister IDL Factory
const logisticsIdlFactory = ({ IDL }: { IDL: any }) => {
  const LoadStatus = IDL.Variant({
    'Posted': IDL.Null,
    'Bidding': IDL.Null,
    'Assigned': IDL.Null,
    'PickedUp': IDL.Null,
    'InTransit': IDL.Null,
    'Delivered': IDL.Null,
    'Completed': IDL.Null,
    'Cancelled': IDL.Null,
  });

  const LoadType = IDL.Variant({
    'DryVan': IDL.Null,
    'Refrigerated': IDL.Null,
    'Flatbed': IDL.Null,
    'Tanker': IDL.Null,
    'Container': IDL.Null,
    'Other': IDL.Text,
  });

  const Load = IDL.Record({
    'id': IDL.Text,
    'shipper': IDL.Principal,
    'origin': IDL.Text,
    'destination': IDL.Text,
    'pickup_date': IDL.Text,
    'delivery_date': IDL.Text,
    'weight': IDL.Text,
    'load_type': LoadType,
    'rate': IDL.Nat64,
    'distance': IDL.Text,
    'description': IDL.Text,
    'status': LoadStatus,
    'assigned_driver': IDL.Opt(IDL.Principal),
    'escrow_id': IDL.Opt(IDL.Text),
    'created_at': IDL.Nat64,
    'updated_at': IDL.Nat64,
  });

  return IDL.Service({
    'get_available_loads': IDL.Func([], [IDL.Vec(Load)], ['query']),
    'get_load': IDL.Func([IDL.Text], [IDL.Opt(Load)], ['query']),
    'get_my_loads': IDL.Func([], [IDL.Vec(Load)], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
  });
};

// ============ SERVICE ============

class LogisticsService {
  private actor: any = null;
  private identity: Identity | null = null;

  private async ensureActor() {
    if (!this.actor) {
      const authClient = await AuthClient.create();
      const identity = authClient.getIdentity();
      this.identity = identity;

      const agent = new HttpAgent({
        identity,
        host: getICHost(),
      });

      if (!isMainnet()) {
        await agent.fetchRootKey();
      }

      const canisterId = getCanisterId('logistics');
      this.actor = Actor.createActor(logisticsIdlFactory, {
        agent,
        canisterId,
      });
    }
  }

  // Convert backend load to frontend format
  private convertLoad(backend: BackendLoad): Load {
    const shipper = typeof backend.shipper === 'object' && 'toText' in backend.shipper
      ? backend.shipper.toText()
      : String(backend.shipper);

    const equipmentType = 'DryVan' in backend.load_type ? 'dry_van' as const :
                         'Refrigerated' in backend.load_type ? 'refrigerated' as const :
                         'Flatbed' in backend.load_type ? 'flatbed' as const :
                         'Tanker' in backend.load_type ? 'tanker' as const :
                         'Container' in backend.load_type ? 'container' as const :
                         'other' as const;

    const status = 'Posted' in backend.status ? 'available' as const :
                   'Bidding' in backend.status ? 'available' as const :
                   'Assigned' in backend.status ? 'booked' as const :
                   'PickedUp' in backend.status ? 'in_transit' as const :
                   'InTransit' in backend.status ? 'in_transit' as const :
                   'Delivered' in backend.status ? 'delivered' as const :
                   'available' as const;

    const assignedDriver = backend.assigned_driver && Array.isArray(backend.assigned_driver) && backend.assigned_driver.length > 0
      ? (typeof backend.assigned_driver[0] === 'object' && 'toText' in backend.assigned_driver[0]
          ? backend.assigned_driver[0].toText()
          : String(backend.assigned_driver[0]))
      : undefined;

    return {
      id: backend.id,
      shipper,
      origin: backend.origin,
      destination: backend.destination,
      pickupDate: backend.pickup_date,
      deliveryDate: backend.delivery_date,
      weight: backend.weight,
      equipmentType,
      rate: backend.rate,
      distance: backend.distance,
      description: backend.description,
      status,
      assignedDriver,
      createdAt: Number(backend.created_at) / 1_000_000,
      updatedAt: Number(backend.updated_at) / 1_000_000,
    };
  }

  async getAvailableLoads(): Promise<Load[]> {
    await this.ensureActor();
    
    try {
      const backendLoads = await this.actor.get_available_loads() as BackendLoad[];
      return backendLoads.map(load => this.convertLoad(load));
    } catch (error: any) {
      console.error('Failed to fetch loads:', error);
      throw new Error(error.message || 'Failed to fetch loads');
    }
  }

  async getLoad(loadId: string): Promise<Load | null> {
    await this.ensureActor();
    
    try {
      const backendLoad = await this.actor.get_load(loadId) as BackendLoad | [] | [BackendLoad];
      if (!backendLoad || (Array.isArray(backendLoad) && backendLoad.length === 0)) {
        return null;
      }
      
      const load = Array.isArray(backendLoad) ? backendLoad[0] : backendLoad;
      return this.convertLoad(load);
    } catch (error: any) {
      console.error('Failed to fetch load:', error);
      return null;
    }
  }

  async trackShipment(trackingId: string): Promise<Shipment | null> {
    // For now, try to get load by ID
    const load = await this.getLoad(trackingId);
    if (!load) {
      return null;
    }

    // Convert load to shipment format
    return {
      id: trackingId,
      loadId: load.id,
      status: load.status === 'in_transit' ? 'in_transit' as const :
              load.status === 'delivered' ? 'delivered' as const :
              load.status === 'booked' ? 'picked_up' as const :
              'in_transit' as const,
      origin: load.origin,
      destination: load.destination,
      estimatedDelivery: load.deliveryDate,
      updates: [
        {
          timestamp: load.createdAt,
          location: load.origin,
          status: 'picked_up',
          message: 'Load picked up',
        },
        ...(load.status === 'in_transit' || load.status === 'delivered' ? [{
          timestamp: load.updatedAt,
          location: load.status === 'delivered' ? load.destination : 'In transit',
          status: load.status,
          message: load.status === 'delivered' ? 'Delivered' : 'In transit',
        }] : []),
      ],
    };
  }
}

export const logisticsService = new LogisticsService();

